#!/bin/bash
# EduStream+ — Provisioning for Azure for Students subscriptions
#
# Architecture (student-sub friendly):
#   - Azure Table Storage (NoSQL)  — replaces Cosmos DB (regional restrictions)
#   - Azure Blob Storage           — videos, images, audio
#   - Azure App Service (F1)       — Express API + SPA frontend
#   - Application Insights         — telemetry, dashboards
#   - Azure Key Vault              — secrets, Managed Identity wired
#   - Azure AI Content Safety      — OPTIONAL (script handles failure gracefully)
#
# Usage:
#   chmod +x scripts/setup-azure.sh
#   ./scripts/setup-azure.sh

set -e

# ============================================================
# CONFIG
# ============================================================
INITIALS="emon"
LOCATION="francecentral"
RG="edustream-rg"

STORAGE="edustreamstor${INITIALS}"
APP_PLAN="edustream-plan"
APP="edustream-app-${INITIALS}"
INSIGHTS="edustream-insights"
KV="edustream-kv-${INITIALS}"
SAFETY="edustream-safety-${INITIALS}"

# ============================================================
# Pre-flight
# ============================================================
echo "🔍 Pre-flight checks..."
az account show > /dev/null 2>&1 || { echo "❌ Run 'az login' first"; exit 1; }

SUB_ID=$(az account show --query id -o tsv)
SUB_NAME=$(az account show --query name -o tsv)
USER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)

echo "✅ Subscription: $SUB_NAME ($SUB_ID)"
echo "✅ Region: $LOCATION"
echo "✅ Initials: $INITIALS"
echo ""

read -p "🚀 Proceed? [y/N] " -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && { echo "Aborted."; exit 0; }

# Force CLI to use this subscription on every call
az account set --subscription "$SUB_ID"

# ============================================================
# 1. Resource group
# ============================================================
echo ""
echo "📦 [1/6] Resource group..."
az group create --name $RG --location $LOCATION --subscription "$SUB_ID" --output none
echo "✅ $RG"

# ============================================================
# 2. Storage account (hosts both Table NoSQL DB and Blob containers)
# ============================================================
echo ""
echo "💾 [2/6] Storage account (Table + Blob)..."
az storage account create \
  --name $STORAGE --resource-group $RG --subscription "$SUB_ID" \
  --location $LOCATION --sku Standard_LRS --kind StorageV2 \
  --allow-blob-public-access true \
  --output none

STORAGE_CONN=$(az storage account show-connection-string --name $STORAGE --resource-group $RG --subscription "$SUB_ID" --query connectionString -o tsv)

# Blob containers (3) for media types
for cname in videos images audio; do
  az storage container create \
    --name $cname --account-name $STORAGE \
    --connection-string "$STORAGE_CONN" \
    --public-access blob --output none
  echo "   - blob container: $cname"
done

# Table Storage tables (3) — created at runtime by the app, but pre-creating speeds first request
for tname in courses comments enrollments; do
  az storage table create \
    --name $tname --account-name $STORAGE \
    --connection-string "$STORAGE_CONN" --output none
  echo "   - table: $tname"
done
echo "✅ Storage with 3 blob containers + 3 tables"

# ============================================================
# 3. App Service + App Insights
# ============================================================
echo ""
echo "🖥️  [3/6] App Service Plan + Web App..."
az appservice plan create \
  --name $APP_PLAN --resource-group $RG --subscription "$SUB_ID" \
  --location $LOCATION --sku F1 --is-linux --output none

az webapp create \
  --name $APP --resource-group $RG --subscription "$SUB_ID" \
  --plan $APP_PLAN --runtime "NODE:22-lts" --output none

az webapp update --name $APP --resource-group $RG --subscription "$SUB_ID" --https-only true --output none
az webapp identity assign --name $APP --resource-group $RG --subscription "$SUB_ID" --output none
APP_IDENTITY=$(az webapp identity show --name $APP --resource-group $RG --subscription "$SUB_ID" --query principalId -o tsv)
echo "✅ Web App: https://${APP}.azurewebsites.net"

echo ""
echo "📊 [4/6] Application Insights..."
az extension add --name application-insights --yes --only-show-errors 2>/dev/null || true
az monitor app-insights component create \
  --app $INSIGHTS --location $LOCATION --resource-group $RG --subscription "$SUB_ID" \
  --kind web --output none

INSIGHTS_CONN=$(az monitor app-insights component show --app $INSIGHTS --resource-group $RG --subscription "$SUB_ID" --query connectionString -o tsv)
echo "✅ Application Insights"

# ============================================================
# 4. Key Vault
# ============================================================
echo ""
echo "🔐 [5/6] Key Vault..."
az keyvault create \
  --name $KV --resource-group $RG --subscription "$SUB_ID" \
  --location $LOCATION --enable-rbac-authorization true --output none

KV_ID=$(az keyvault show --name $KV --resource-group $RG --subscription "$SUB_ID" --query id -o tsv)

az role assignment create \
  --role "Key Vault Secrets Officer" \
  --assignee $USER_OBJECT_ID \
  --scope $KV_ID --output none 2>/dev/null || true

az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id $APP_IDENTITY \
  --assignee-principal-type ServicePrincipal \
  --scope $KV_ID --output none

echo "⏳ Waiting 30s for RBAC propagation..."
sleep 30

az keyvault secret set --vault-name $KV --name "storage-connection-string" --value "$STORAGE_CONN" --output none
echo "✅ Key Vault with storage secret"

# ============================================================
# 5. Content Safety (best-effort)
# ============================================================
echo ""
echo "🛡️  [6/6] Content Safety (skip if not allowed)..."
SAFETY_CREATED=false
if az cognitiveservices account create \
  --name $SAFETY --resource-group $RG --subscription "$SUB_ID" \
  --location $LOCATION --kind ContentSafety --sku F0 \
  --custom-domain $SAFETY --yes --output none 2>/dev/null; then
  SAFETY_ENDPOINT=$(az cognitiveservices account show --name $SAFETY --resource-group $RG --subscription "$SUB_ID" --query properties.endpoint -o tsv)
  SAFETY_KEY=$(az cognitiveservices account keys list --name $SAFETY --resource-group $RG --subscription "$SUB_ID" --query key1 -o tsv)
  az keyvault secret set --vault-name $KV --name "content-moderator-endpoint" --value "$SAFETY_ENDPOINT" --output none
  az keyvault secret set --vault-name $KV --name "content-moderator-key" --value "$SAFETY_KEY" --output none
  SAFETY_CREATED=true
  echo "✅ Content Safety created"
else
  echo "⚠️  Content Safety not allowed on this subscription — using built-in word-list moderation fallback"
fi

# ============================================================
# 6. App Service environment
# ============================================================
echo ""
echo "⚙️  Configuring App Service env vars..."
az webapp config appsettings set \
  --name $APP --resource-group $RG --subscription "$SUB_ID" \
  --settings \
    KEY_VAULT_URL="https://${KV}.vault.azure.net/" \
    AUTH_ENABLED="false" \
    NODE_ENV="production" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    WEBSITE_NODE_DEFAULT_VERSION="~20" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="$INSIGHTS_CONN" \
  --output none

az webapp config set \
  --name $APP --resource-group $RG --subscription "$SUB_ID" \
  --startup-file "npm start" --output none
echo "✅ App Service configured"

# Lifecycle policy
cat > /tmp/lifecycle.json <<'EOF'
{"rules":[
  {"name":"tier-cold-videos","enabled":true,"type":"Lifecycle","definition":{"filters":{"blobTypes":["blockBlob"],"prefixMatch":["videos/"]},"actions":{"baseBlob":{"tierToCool":{"daysAfterModificationGreaterThan":30}}}}},
  {"name":"tier-cold-images","enabled":true,"type":"Lifecycle","definition":{"filters":{"blobTypes":["blockBlob"],"prefixMatch":["images/"]},"actions":{"baseBlob":{"tierToCool":{"daysAfterModificationGreaterThan":60}}}}},
  {"name":"tier-cold-audio","enabled":true,"type":"Lifecycle","definition":{"filters":{"blobTypes":["blockBlob"],"prefixMatch":["audio/"]},"actions":{"baseBlob":{"tierToCool":{"daysAfterModificationGreaterThan":45}}}}}
]}
EOF
az storage account management-policy create \
  --account-name $STORAGE --resource-group $RG --subscription "$SUB_ID" \
  --policy @/tmp/lifecycle.json --output none
rm -f /tmp/lifecycle.json
echo "✅ Blob lifecycle rules"

# ============================================================
# Summary
# ============================================================
APP_URL="https://${APP}.azurewebsites.net"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🎉 EduStream+ Azure setup complete                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  ✅ Storage:          $STORAGE"
echo "       Tables:         courses, comments, enrollments"
echo "       Blob:           videos, images, audio"
echo "  ✅ App Service:      $APP_URL"
echo "  ✅ App Insights:     $INSIGHTS"
echo "  ✅ Key Vault:        $KV"
if [ "$SAFETY_CREATED" = true ]; then
  echo "  ✅ Content Safety:   $SAFETY"
else
  echo "  ⚠️  Content Safety:   skipped — using fallback moderation"
fi
echo ""
echo "📋 NEXT STEPS:"
echo "  1. Push to GitHub:"
echo "     git init && git add . && git commit -m 'Initial build'"
echo "     gh repo create edustream --public --source=. --push"
echo ""
echo "  2. Portal → App Service '$APP' → Deployment Center → GitHub → main → Save"
echo ""
echo "  3. Wait ~5 min, then visit: $APP_URL"
echo ""
echo "🗑️  Clean up later: az group delete --name $RG --yes --no-wait"
echo ""