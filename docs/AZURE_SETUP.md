# Azure Setup Guide — EduStream+

Every Azure resource and its exact configuration, in the order to create them.

**Region for everything:** UK South (closest to London)
**Resource Group:** `edustream-rg`
**Naming convention:** `edustream-<resource>-<your-initials>` to avoid global name conflicts. Replace `<initials>` with e.g. `mre`.

---

## 1. Resource Group

Portal → Resource groups → Create
- Name: `edustream-rg`
- Region: UK South

---

## 2. Cosmos DB (NoSQL)

Portal → Create resource → "Azure Cosmos DB" → "Azure Cosmos DB for NoSQL"

**Basics:**
- Subscription: yours
- Resource group: `edustream-rg`
- Account name: `edustream-cosmos-<initials>`
- Location: UK South
- Capacity mode: Provisioned throughput
- Apply Free Tier discount: **Yes** (1000 RU/s + 25 GB free forever)
- Limit total account throughput: Yes, 1000 RU/s

**Networking:** Public endpoint (all networks)
**Backup policy:** Periodic, default
**Encryption:** default

After creation (~5 min):
- Settings → Keys → copy **Primary Connection String** to a notepad

The app will create the database and containers automatically on first start (idempotent).

---

## 3. Storage Account

Portal → Create resource → "Storage account"

**Basics:**
- Resource group: `edustream-rg`
- Storage account name: `edustreamstor<initials>` (lowercase, no dashes, must be globally unique)
- Region: UK South
- Performance: Standard
- Redundancy: LRS (locally-redundant — cheapest, sufficient for coursework)

**Advanced:** defaults
**Networking:** Public access from all networks
**Data protection:** Enable blob soft delete (7 days)

After creation:
1. Containers → + Container
   - Name: `videos`
   - Public access level: **Blob (anonymous read access for blobs only)**
2. Security + networking → Access keys → copy key1 **Connection string**
3. Lifecycle management → Add rule
   - Name: `tier-old-videos-to-cool`
   - Rule scope: All blobs in container "videos"
   - Conditions: Move to cool storage if not modified in 30 days
   - This demonstrates "expert level" use of Blob Storage features

---

## 4. App Service

Portal → Create resource → "Web App"

**Basics:**
- Resource group: `edustream-rg`
- Name: `edustream-app-<initials>` (must be globally unique — this becomes your URL)
- Publish: Code
- Runtime stack: **Node 20 LTS**
- Operating system: **Linux**
- Region: UK South
- Linux Plan: Create new
  - Name: `edustream-plan`
  - SKU: **Free F1**

**Deployment:**
- Continuous deployment: Disable for now (we'll set this up properly later)

**Networking:** defaults
**Monitoring:**
- Enable Application Insights: **Yes**
- Application Insights: Create new → name `edustream-insights`
  - Region: UK South

This auto-creates the App Insights resource and injects `APPLICATIONINSIGHTS_CONNECTION_STRING` into your app settings — saves 10 minutes vs setting up separately.

After creation, your app URL is `https://edustream-app-<initials>.azurewebsites.net`.

### Configure App Service

After creation:

1. **Settings → Configuration → General settings:**
   - Stack: Node
   - Major version: 20 LTS
   - Startup command: `npm start`
   - HTTPS Only: **On**
   - Minimum TLS version: 1.2

2. **Settings → Identity → System assigned → Status: On** (Save)
   - Copy the **Object (principal) ID** — you'll grant this Key Vault access in step 6

3. **Don't set environment variables yet** — Key Vault setup comes next

---

## 5. Microsoft Entra ID (Azure AD) App Registration

Portal → Microsoft Entra ID → App registrations → + New registration

- Name: `edustream-auth`
- Supported account types: Accounts in this organizational directory only
- Redirect URI:
  - Platform: Single-page application (SPA)
  - URI: `https://edustream-app-<initials>.azurewebsites.net`

After creation:
1. **Overview** — copy:
   - Application (client) ID
   - Directory (tenant) ID
2. **Authentication** → Add another redirect URI: `http://localhost:3000` (for local dev)
3. **Authentication** → Implicit grant: tick **ID tokens** and **Access tokens**
4. **Expose an API** → Set Application ID URI (accept default) → Add a scope
   - Scope name: `access_as_user`
   - Who can consent: Admins and users
   - Admin consent display name: "Access EduStream+ as user"
   - Admin consent description: "Allows the app to access EduStream+ on behalf of the signed-in user"
   - State: Enabled
5. **API permissions** → Add → Microsoft Graph → Delegated → `User.Read` → Add → Grant admin consent

---

## 6. Key Vault

Portal → Create resource → "Key Vault"

**Basics:**
- Resource group: `edustream-rg`
- Name: `edustream-kv-<initials>`
- Region: UK South
- Pricing tier: Standard

**Access configuration:** Azure role-based access control (RBAC) — recommended

After creation:

1. **Access control (IAM) → + Add role assignment:**
   - Role: **Key Vault Secrets User**
   - Assign access to: Managed identity
   - Select: your App Service's managed identity (`edustream-app-<initials>`)
   - Save

2. Also assign **Key Vault Secrets Officer** to your own user account so you can add secrets:
   - + Add role assignment → Key Vault Secrets Officer → User → yourself

3. **Objects → Secrets → + Generate/Import:**
   - Name: `cosmos-connection-string`
   - Value: paste your Cosmos connection string
   - Save
4. Repeat for:
   - `storage-connection-string` → your Storage connection string
   - `content-moderator-endpoint` → (filled in step 7)
   - `content-moderator-key` → (filled in step 7)

---

## 7. Azure AI Content Safety

Portal → Create resource → search "Content Safety" → Azure AI Content Safety

- Resource group: `edustream-rg`
- Region: UK South (or East US if UK South is unavailable)
- Name: `edustream-content-safety`
- Pricing tier: Free F0 (5 transactions/sec, 5K transactions/month)

After creation:
- Resource Management → Keys and Endpoint → copy:
  - Endpoint URL
  - KEY 1
- Add these to Key Vault as `content-moderator-endpoint` and `content-moderator-key`

---

## 8. Azure CDN

Portal → Create resource → "Front Door and CDN profiles" → "Azure CDN" (classic)

- Resource group: `edustream-rg`
- Name: `edustream-cdn-profile`
- Pricing tier: **Standard Microsoft**
- Create a new CDN endpoint now: Yes
  - CDN endpoint name: `edustream-videos-<initials>`
  - Origin type: Storage
  - Origin hostname: select your storage account from dropdown
  - Origin path: `/videos`

After creation (provisioning takes 5–10 min):
- Copy the endpoint URL: `https://edustream-videos-<initials>.azureedge.net`

This is your `CDN_ENDPOINT` env var.

---

## 9. Configure App Service environment variables

App Service → Settings → Environment variables → "App settings" tab → + Add:

| Name | Value |
|---|---|
| `KEY_VAULT_URL` | `https://edustream-kv-<initials>.vault.azure.net/` |
| `AUTH_ENABLED` | `true` |
| `AZURE_TENANT_ID` | (from app registration) |
| `AZURE_CLIENT_ID` | (from app registration) |
| `CDN_ENDPOINT` | `https://edustream-videos-<initials>.azureedge.net` |
| `NODE_ENV` | `production` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |

Apply → the app restarts automatically.

(Note: `APPLICATIONINSIGHTS_CONNECTION_STRING` was auto-injected when you enabled App Insights during App Service creation.)

---

## 10. Verify resource group

Open `edustream-rg` → you should see all of these:

- ✅ App Service `edustream-app-<initials>`
- ✅ App Service Plan `edustream-plan`
- ✅ Application Insights `edustream-insights`
- ✅ Cosmos DB account `edustream-cosmos-<initials>`
- ✅ Storage account `edustreamstor<initials>`
- ✅ Key Vault `edustream-kv-<initials>`
- ✅ Content Safety `edustream-content-safety`
- ✅ CDN profile `edustream-cdn-profile`
- ✅ CDN endpoint (inside the profile)
- ✅ Smart Detector / Action Group (auto-created with App Insights)

That's 10 distinct Azure services in one resource group — directly demonstrating the "Masterful use of Azure resources" rubric criterion.

---

## 11. Set up GitHub Actions deployment

After your code is in GitHub:

App Service → Deployment → Deployment Center
- Source: GitHub
- Authorize GitHub
- Organization: your username
- Repository: `edustream`
- Branch: `main`
- Authentication: User-assigned managed identity (recommended) or basic auth
- Build provider: GitHub Actions
- Save

Azure writes a workflow file to `.github/workflows/main_<app-name>.yml` and triggers the first build.

Watch the build at: github.com/yourusername/edustream/actions
