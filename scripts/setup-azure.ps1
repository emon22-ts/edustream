# EduStream+ — One-shot Azure resource provisioning (Windows PowerShell version)
#
# Same as setup-azure.sh but for PowerShell on Windows
#
# PREREQUISITES:
#   - Azure CLI: winget install Microsoft.AzureCLI
#   - Logged in: az login
#
# USAGE:
#   .\setup-azure.ps1
#
# RUNTIME: ~10-15 minutes

$ErrorActionPreference = "Stop"

# CONFIG — change INITIALS to something unique to you
$INITIALS = "mre"   # <-- CHANGE THIS
$LOCATION = "uksouth"
$RG = "edustream-rg"

$COSMOS = "edustream-cosmos-$INITIALS"
$STORAGE = "edustreamstor$INITIALS"
$APP_PLAN = "edustream-plan"
$APP = "edustream-app-$INITIALS"
$INSIGHTS = "edustream-insights"
$KV = "edustream-kv-$INITIALS"
$SAFETY = "edustream-safety-$INITIALS"

# Pre-flight
Write-Host "🔍 Checking Azure CLI login..." -ForegroundColor Cyan
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) { Write-Host "❌ Run 'az login' first" -ForegroundColor Red; exit 1 }
Write-Host "✅ Logged in. Subscription: $($account.id)" -ForegroundColor Green

$USER_OBJECT_ID = az ad signed-in-user show --query id -o tsv

$confirmation = Read-Host "🚀 Ready to create EduStream+ resources with initials '$INITIALS'? [y/N]"
if ($confirmation -ne 'y') { Write-Host "Aborted."; exit 0 }

# 1. Resource group
Write-Host "`n📦 [1/8] Creating resource group..." -ForegroundColor Cyan
az group create --name $RG --location $LOCATION --output none
Write-Host "✅ Resource group: $RG"

# 2. Cosmos DB
Write-Host "`n🌐 [2/8] Creating Cosmos DB account (this takes ~5 min)..." -ForegroundColor Cyan
az cosmosdb create --name $COSMOS --resource-group $RG --locations regionName=$LOCATION --enable-free-tier true --default-consistency-level Session --output none

az cosmosdb sql database create --account-name $COSMOS --resource-group $RG --name edustream --output none
az cosmosdb sql container create --account-name $COSMOS --resource-group $RG --database-name edustream --name courses --partition-key-path "/id" --throughput 400 --output none
az cosmosdb sql container create --account-name $COSMOS --resource-group $RG --database-name edustream --name comments --partition-key-path "/courseId" --throughput 400 --output none
az cosmosdb sql container create --account-name $COSMOS --resource-group $RG --database-name edustream --name enrollments --partition-key-path "/userId" --throughput 400 --output none

$COSMOS_CONN = az cosmosdb keys list --name $COSMOS --resource-group $RG --type connection-strings --query "connectionStrings[0].connectionString" -o tsv
Write-Host "✅ Cosmos containers ready"

# 3. Storage
Write-Host "`n💾 [3/8] Creating Storage account..." -ForegroundColor Cyan
az storage account create --name $STORAGE --resource-group $RG --location $LOCATION --sku Standard_LRS --kind StorageV2 --allow-blob-public-access true --output none
$STORAGE_CONN = az storage account show-connection-string --name $STORAGE --resource-group $RG --query connectionString -o tsv
foreach ($containerName in @('videos', 'images', 'audio')) {
  az storage container create --name $containerName --account-name $STORAGE --connection-string $STORAGE_CONN --public-access blob --output none
}
Write-Host "✅ Storage with 3 containers (videos, images, audio) ready"

# 4. App Service
Write-Host "`n🖥️  [4/8] Creating App Service..." -ForegroundColor Cyan
az appservice plan create --name $APP_PLAN --resource-group $RG --location $LOCATION --sku F1 --is-linux --output none
az webapp create --name $APP --resource-group $RG --plan $APP_PLAN --runtime "NODE:20-lts" --output none
az webapp update --name $APP --resource-group $RG --https-only true --output none
az webapp identity assign --name $APP --resource-group $RG --output none
$APP_IDENTITY = az webapp identity show --name $APP --resource-group $RG --query principalId -o tsv
Write-Host "✅ Web App created with Managed Identity"

# 5. App Insights
Write-Host "`n📊 [5/8] Creating Application Insights..." -ForegroundColor Cyan
az extension add --name application-insights --yes --only-show-errors 2>$null
az monitor app-insights component create --app $INSIGHTS --location $LOCATION --resource-group $RG --kind web --output none
$INSIGHTS_CONN = az monitor app-insights component show --app $INSIGHTS --resource-group $RG --query connectionString -o tsv
Write-Host "✅ Application Insights ready"

# 6. Key Vault
Write-Host "`n🔐 [6/8] Creating Key Vault..." -ForegroundColor Cyan
az keyvault create --name $KV --resource-group $RG --location $LOCATION --enable-rbac-authorization true --output none
$KV_ID = az keyvault show --name $KV --resource-group $RG --query id -o tsv

az role assignment create --role "Key Vault Secrets Officer" --assignee $USER_OBJECT_ID --scope $KV_ID --output none 2>$null
az role assignment create --role "Key Vault Secrets User" --assignee-object-id $APP_IDENTITY --assignee-principal-type ServicePrincipal --scope $KV_ID --output none

Write-Host "⏳ Waiting 30s for RBAC propagation..."
Start-Sleep -Seconds 30

az keyvault secret set --vault-name $KV --name "cosmos-connection-string" --value $COSMOS_CONN --output none
az keyvault secret set --vault-name $KV --name "storage-connection-string" --value $STORAGE_CONN --output none
Write-Host "✅ Key Vault with 2 secrets"

# 7. Content Safety
Write-Host "`n🛡️  [7/8] Creating Azure AI Content Safety..." -ForegroundColor Cyan
az cognitiveservices account create --name $SAFETY --resource-group $RG --location $LOCATION --kind ContentSafety --sku F0 --custom-domain $SAFETY --yes --output none
$SAFETY_ENDPOINT = az cognitiveservices account show --name $SAFETY --resource-group $RG --query properties.endpoint -o tsv
$SAFETY_KEY = az cognitiveservices account keys list --name $SAFETY --resource-group $RG --query key1 -o tsv

az keyvault secret set --vault-name $KV --name "content-moderator-endpoint" --value $SAFETY_ENDPOINT --output none
az keyvault secret set --vault-name $KV --name "content-moderator-key" --value $SAFETY_KEY --output none
Write-Host "✅ Content Safety ready, secrets added"

# 8. App Service config
Write-Host "`n⚙️  [8/8] Configuring App Service..." -ForegroundColor Cyan
az webapp config appsettings set --name $APP --resource-group $RG --settings KEY_VAULT_URL="https://$KV.vault.azure.net/" AUTH_ENABLED="false" NODE_ENV="production" SCM_DO_BUILD_DURING_DEPLOYMENT="true" WEBSITE_NODE_DEFAULT_VERSION="~20" APPLICATIONINSIGHTS_CONNECTION_STRING="$INSIGHTS_CONN" --output none
az webapp config set --name $APP --resource-group $RG --startup-file "npm start" --output none
Write-Host "✅ App Service configured"

# Lifecycle rule
$lifecycleJson = @'
{"rules":[
  {"name":"tier-cold-videos","enabled":true,"type":"Lifecycle","definition":{"filters":{"blobTypes":["blockBlob"],"prefixMatch":["videos/"]},"actions":{"baseBlob":{"tierToCool":{"daysAfterModificationGreaterThan":30}}}}},
  {"name":"tier-cold-images","enabled":true,"type":"Lifecycle","definition":{"filters":{"blobTypes":["blockBlob"],"prefixMatch":["images/"]},"actions":{"baseBlob":{"tierToCool":{"daysAfterModificationGreaterThan":60}}}}},
  {"name":"tier-cold-audio","enabled":true,"type":"Lifecycle","definition":{"filters":{"blobTypes":["blockBlob"],"prefixMatch":["audio/"]},"actions":{"baseBlob":{"tierToCool":{"daysAfterModificationGreaterThan":45}}}}}
]}
'@
$lifecycleJson | Out-File -FilePath "$env:TEMP\lifecycle.json" -Encoding utf8
az storage account management-policy create --account-name $STORAGE --resource-group $RG --policy "@$env:TEMP\lifecycle.json" --output none
Remove-Item "$env:TEMP\lifecycle.json"
Write-Host "✅ Lifecycle rule active"

# Summary
$APP_URL = "https://$APP.azurewebsites.net"
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🎉 EduStream+ Azure setup complete                                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  ✅ Cosmos DB:        $COSMOS"
Write-Host "  ✅ Storage:          $STORAGE (lifecycle rule active)"
Write-Host "  ✅ App Service:      $APP_URL"
Write-Host "  ✅ App Insights:     $INSIGHTS"
Write-Host "  ✅ Key Vault:        $KV"
Write-Host "  ✅ Content Safety:   $SAFETY"
Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Push code to GitHub"
Write-Host "  2. In Portal → App Service '$APP' → Deployment Center → connect GitHub repo"
Write-Host "  3. Wait ~5 min for deployment, then visit: $APP_URL"
Write-Host ""
Write-Host "💡 To delete everything later: az group delete --name $RG --yes --no-wait"
