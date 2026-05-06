# Fast-track runbook — minimum clicks, maximum marks

This is the fastest path from zero to submitted. Follow it literally — every click is in order.

**Total time:** ~6 hours of active work spread over 2 days
**Quality target:** High 1st (80-100%)

---

## Day 1 morning — Setup (90 min)

### 1. Sign up for Azure (10 min)

1. Go to https://azure.microsoft.com/free
2. Click "Start free"
3. Sign in with a Microsoft account (or create one)
4. Verify with phone + credit card (no charge on free tier)
5. Wait for "Welcome to Azure"

### 2. Install Azure CLI (10 min)

**Mac:**
```bash
brew install azure-cli
```

**Windows:**
```powershell
winget install Microsoft.AzureCLI
```
Restart your terminal after install.

**Verify:**
```bash
az --version
az login
```
A browser window opens — sign in with your Azure account. Close it when done.

### 3. Install Node.js, Git, GitHub CLI (10 min)

**Mac:**
```bash
brew install node@20 git gh
```

**Windows:**
```powershell
winget install OpenJS.NodeJS.LTS Git.Git GitHub.cli
```

**Verify:**
```bash
node --version    # should print v20.x.x
git --version
gh --version
gh auth login     # follow prompts to log into GitHub
```

### 4. Run the setup script (15 min)

1. Download the EduStream+ zip and unzip it
2. Open the `edustream` folder in a terminal
3. Open `scripts/setup-azure.sh` (or `.ps1` on Windows) in a text editor
4. Find this line near the top:
   ```bash
   INITIALS="mre"
   ```
   Change `mre` to your initials (3-4 lowercase letters, no spaces or numbers)
5. Save the file
6. Run it:

   **Mac/Linux:**
   ```bash
   chmod +x scripts/setup-azure.sh
   ./scripts/setup-azure.sh
   ```

   **Windows:**
   ```powershell
   .\scripts\setup-azure.ps1
   ```

7. Type `y` when prompted
8. Wait ~10 minutes — the script creates everything

When it finishes, you'll see a summary with your app URL. **Copy that URL — you'll need it.**

### 5. Push code to GitHub (15 min)

```bash
cd edustream
git init
git add .
git commit -m "Initial EduStream+ build"
gh repo create edustream --public --source=. --push
```

When `gh` prompts, accept the defaults. Your code is now at `https://github.com/YOUR_USERNAME/edustream`.

### 6. Wire up GitHub deployment (10 min)

1. Open Azure Portal → search for your App Service (`edustream-app-<initials>`)
2. Left menu → **Deployment Center**
3. Source: **GitHub**
4. Click "Authorize" if needed
5. Organization: your GitHub username
6. Repository: `edustream`
7. Branch: `main`
8. Build provider: **GitHub Actions**
9. Click **Save** at the top

GitHub Actions starts a build. Watch it at github.com/YOUR_USERNAME/edustream → Actions tab. **First build takes 5-10 min.**

### 7. Test the live app (10 min)

While the build runs, take a 10-minute break.

When the green checkmark appears, open your app URL in a browser. The EduStream+ page should load.

**Try it:**
- Create a course (any title, optionally attach a small video)
- Verify it appears
- Click Edit, change the title
- Click Delete
- Refresh — list is empty again

If it works → 70% locked in. ✅

If it doesn't work → see Troubleshooting at the bottom.

---

## Day 1 afternoon — Optional advanced features (3 hours)

Each one adds marks. Do as many as you have time for, in this order.

### Feature A: App Insights dashboard (45 min) — DO THIS

1. Generate test data first: in your live app, create 5 courses, edit 2, delete 1, post some comments
2. Wait 5 min for telemetry to flush
3. Portal → search "Application Insights" → click `edustream-insights`
4. Open `docs/APP_INSIGHTS_DASHBOARDS.md` from your project
5. Click "Logs" in App Insights left menu
6. Copy each KQL query from the doc, paste, click "Run", click "Pin to" → "New dashboard"
7. Repeat for all 6 queries
8. Save the dashboard, name it "EduStream+ Operations"

This single dashboard is your "advanced features integrated at expert level" demo.

### Feature B: Add Entra ID auth (90 min) — RECOMMENDED

1. Portal → Microsoft Entra ID → App registrations → **+ New registration**
   - Name: `edustream-auth`
   - Account types: This directory only
   - Redirect URI: select **Single-page application (SPA)**, URL: paste your app URL
   - Register
2. **Overview** page — copy:
   - **Application (client) ID**
   - **Directory (tenant) ID**
3. **Authentication** → Add platform → Single-page application
   - Add another redirect URI: `http://localhost:3000`
   - Save
4. **Expose an API** → Set the Application ID URI (accept default)
   - Add a scope: name `access_as_user`, admins and users, fill descriptions, **Enable**
5. **API permissions** → Add → Microsoft Graph → Delegated → `User.Read` → Add → **Grant admin consent**

Now wire it into your code:

6. Open `public/index.html` in VS Code
7. Find the `</head>` tag
8. Just before it, add:
   ```html
   <script>
     window.AZURE_CLIENT_ID = 'PASTE-CLIENT-ID-HERE';
     window.AZURE_TENANT_ID = 'PASTE-TENANT-ID-HERE';
   </script>
   ```
9. In Portal → App Service → Environment variables → change `AUTH_ENABLED` from `false` to `true`, Save
10. Commit and push:
    ```bash
    git add public/index.html
    git commit -m "Enable Entra ID auth"
    git push
    ```
11. Wait 5 min for redeploy
12. Visit your app — click "Sign in" — Microsoft popup appears — sign in — your name shows in header
13. Try creating a course while signed in: works
14. Sign out, try creating: should get 401 error

### Feature C: Configure CDN (30 min) — RECOMMENDED

1. Portal → Create a resource → search "Front Door and CDN profiles"
2. Click "Azure CDN" (the older classic one — easier)
3. Configure:
   - Resource group: `edustream-rg`
   - Name: `edustream-cdn`
   - Tier: **Standard Microsoft**
   - Create new endpoint:
     - Endpoint name: `edustream-videos-<initials>`
     - Origin type: Storage
     - Origin hostname: pick your storage account
     - Origin path: `/videos`
4. Review + create
5. Wait ~10 min for provisioning
6. Once "Running", copy the endpoint URL
7. Portal → App Service → Environment variables → Add new:
   - Name: `CDN_ENDPOINT`
   - Value: `https://edustream-videos-<initials>.azureedge.net`
   - Save (app restarts)
8. Upload a new video — its URL now points to CDN

### Feature D: Configure alert (15 min)

1. Portal → App Insights → Alerts → **+ Create** → Alert rule
2. Scope: your App Insights resource (already set)
3. Condition: Add → "Failed requests" signal → threshold > 5 in 5 min → Done
4. Action: Create action group → notify email → your email → OK
5. Details: name = "EduStream high failure rate"
6. Save

---

## Day 2 morning — Verification (90 min)

Run through this checklist. If anything is broken, fix before recording.

### Live app
- [ ] App URL loads
- [ ] Sign-in popup works (if Feature B enabled)
- [ ] Create course with video → succeeds
- [ ] Video plays inline
- [ ] Edit course → succeeds
- [ ] Delete course → both Cosmos doc and blob removed (check both)
- [ ] Comment posts work
- [ ] Try creating without sign-in → 401 (if auth enabled)

### Azure resources
- [ ] Resource group has all resources
- [ ] App Service is "Running"
- [ ] Cosmos Data Explorer shows your test data
- [ ] Blob container shows uploaded videos
- [ ] Key Vault has 4 secrets
- [ ] App Insights Live Metrics shows traffic
- [ ] Custom dashboard has tiles populated
- [ ] GitHub Actions latest run is green

If everything passes → record video.

---

## Day 2 afternoon — Record video (3 hours including retakes)

### Pre-record (30 min)

1. **Wake up the F1 App Service** — visit your URL twice 1 minute apart
2. Open browser tabs in this order (Cmd/Ctrl+T to make new ones):
   1. Live app (signed in)
   2. Resource group
   3. App Service overview
   4. Cosmos Data Explorer (Database edustream → Container courses → Items)
   5. Blob container (Storage account → Containers → videos)
   6. Key Vault → Objects → Secrets
   7. App Insights → your dashboard
   8. App Insights → Live Metrics
   9. GitHub → your edustream repo → Actions tab
   10. Entra ID → App registrations → edustream-auth (if Feature B done)
3. Close every other tab and app
4. Test webcam, mic, and screen sharing in Panopto Capture
5. Have a small (~5MB) video file ready, named simply (`demo.mp4`)
6. Open `docs/VIDEO_SCRIPT.md` on a phone or second screen for reference

### Record (60 min)

1. Open Panopto Capture from Blackboard
2. Select webcam + screen share
3. Read through the script once silently
4. Record
5. If you stumble in first 30 seconds → restart
6. If you stumble after that → keep going, small slips are fine
7. Stay under 5:00

### Review and re-record (60 min)

1. Watch back at 1.25x speed
2. Check audio is clear (no hum, no echo)
3. Check screens are readable
4. If any major issue → re-record
5. Otherwise → submit to Panopto assignment

### Submit (15 min)

1. In Panopto, click "Submit to assignment"
2. Pick your CW2 assignment from Blackboard
3. Verify submission shows up in Blackboard

### Post-submission cleanup (15 min)

1. Final commit: `git push` any last changes
2. **Stop your App Service to save free credits:** Portal → App Service → Stop button at top
3. Email yourself: app URL, GitHub URL, Panopto submission link

✅ **Done. Go celebrate.**

---

## Troubleshooting

### App shows "Welcome to App Service" page after deployment
- GitHub Actions still running, or didn't run yet
- Go to GitHub → Actions tab, click the latest run, check logs

### App shows "Application Error"
- Portal → App Service → Log stream
- Common causes:
  - Cosmos/Storage connection string wrong → check Key Vault values match originals
  - Managed Identity not propagated yet → wait 5 min, restart app
  - Node version mismatch → check Configuration → Stack settings shows Node 20

### "Unauthorized" 401 from Key Vault in logs
- App Service → Identity → System assigned should be "On"
- Key Vault → Access control (IAM) should show your App Service has "Key Vault Secrets User"
- Restart app after granting role

### Videos won't play
- Blob container public access level must be "Blob (anonymous read)"
- Storage account → Configuration → "Allow Blob anonymous access" must be Enabled

### CORS errors in browser console
- Shouldn't happen since frontend is served from same domain as API
- If they do appear, App Service → CORS → add `*` (development only)

### Sign-in popup blocked
- Browser blocking popups → allow popups for your app URL

### Sign-in succeeds but POST still 401
- Check Entra ID app registration → Authentication → has SPA redirect URI matching exactly
- Check `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` env vars on App Service match the registration
- Clear browser cache and try again

### "Quota exceeded" on Cosmos / Content Safety
- Free tier already used elsewhere on subscription
- Either delete the other free-tier resource, or change tier (small cost)

### GitHub Actions fails on "az login"
- You need to set up federated credentials manually OR use the simpler "publish profile" auth
- Easiest: in App Service → Get publish profile (downloads XML)
- GitHub repo → Settings → Secrets → Actions → New secret named `AZUREAPPSERVICE_PUBLISHPROFILE` → paste XML
- Edit `.github/workflows/deploy.yml` to use publish-profile auth (Azure Portal's auto-generated workflow does this by default — easier to let Deployment Center generate it for you)

---

## Final note

If you hit something not in this troubleshooting list, message me with **the exact error text** from the App Service Log Stream and we'll fix it together.
