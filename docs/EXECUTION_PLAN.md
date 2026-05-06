# Two-day execution plan — High 1st target

**Total budget:** 16 hours across two days
**Target grade band:** 80-100% (High 1st)
**Buffer rule:** if a block runs >25% over budget, skip ahead and circle back later

---

## Day 1 (8 hours) — Build everything

### Block A — Setup & all Azure resources (3 hours)

**A1. Tooling (30 min)**
- [ ] Sign up for Azure free tier at portal.azure.com (£150 credit)
- [ ] Install Node.js 20 LTS, VS Code, Git, GitHub CLI
- [ ] Install VS Code extensions: "Azure Tools" pack, "Azure App Service", "Azure Resources"
- [ ] Sign into Azure from VS Code (Cmd/Ctrl+Shift+P → "Azure: Sign In")

**A2. Resource group + core data services (45 min)**
Follow `docs/AZURE_SETUP.md` sections 1–4:
- [ ] Resource group `edustream-rg`
- [ ] Cosmos DB account (with free tier)
- [ ] Storage account + `videos` container (Blob anonymous read)
- [ ] App Service (Node 20 LTS, Linux, F1) with App Insights enabled
- [ ] Copy connection strings to a notepad

**A3. Identity, security, AI services (90 min)**
- [ ] Microsoft Entra ID app registration (`edustream-auth`) — copy tenant ID and client ID
- [ ] Key Vault `edustream-kv-<initials>` with RBAC role assignments
- [ ] Add 4 secrets to Key Vault (Cosmos, Storage, Content Safety endpoint, Content Safety key)
- [ ] Enable App Service System-assigned Managed Identity
- [ ] Grant App Service identity "Key Vault Secrets User" role
- [ ] Azure AI Content Safety resource (Free F0 tier)
- [ ] Azure CDN profile + endpoint pointing at Storage `/videos`

**A4. App Service environment variables (15 min)**
Configure these in App Service → Settings → Environment variables:
- [ ] `KEY_VAULT_URL`
- [ ] `AUTH_ENABLED=true`
- [ ] `AZURE_TENANT_ID`
- [ ] `AZURE_CLIENT_ID`
- [ ] `CDN_ENDPOINT`
- [ ] `NODE_ENV=production`

**Checkpoint A:** Resource group should now contain ~10 resources. Take a screenshot.

---

### Block B — Local code working end-to-end (3 hours)

**B1. Get the starter code (15 min)**
- [ ] Download the starter zip provided
- [ ] Unzip into a folder called `edustream`
- [ ] `cd edustream && npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Paste your Cosmos and Storage connection strings into `.env`
- [ ] Set `AUTH_ENABLED=false` in `.env` for local testing

**B2. Run locally and test (30 min)**
- [ ] `npm start`
- [ ] Open http://localhost:3000
- [ ] Try creating a course with a video file (use a short clip, ~5 MB)
- [ ] Verify in Cosmos Data Explorer that the document was created
- [ ] Verify in Storage Explorer that the blob was uploaded
- [ ] Edit the title — verify update works
- [ ] Delete the course — verify both Cosmos doc and blob are removed

**If anything fails locally, fix it before deploying.** Read the error in the terminal — 95% of issues at this stage are wrong connection strings or wrong container names.

**B3. Push to GitHub (30 min)**
- [ ] Create GitHub repo `edustream` (public)
- [ ] `git init && git add . && git commit -m "Initial EduStream+ build"`
- [ ] `git remote add origin https://github.com/YOUR_USERNAME/edustream.git`
- [ ] `git branch -M main && git push -u origin main`
- [ ] **Verify `.env` is NOT in the repo.** If it is, regenerate Azure keys immediately

**B4. Deploy via Deployment Center (60 min)**
- [ ] App Service → Deployment Center → GitHub → authorize → select repo and `main` branch
- [ ] Build provider: GitHub Actions
- [ ] Save → first deployment runs (~5-10 min)
- [ ] While waiting: open App Service → Log stream so you can debug if it fails
- [ ] Once deployed, open `https://edustream-app-<initials>.azurewebsites.net`
- [ ] Try creating a course — if 500, check Log stream for the exact error

**Common fixes:**
- `Cannot find module 'X'` → `npm install` ran but didn't deploy node_modules — set `SCM_DO_BUILD_DURING_DEPLOYMENT=true` in app settings
- `EACCES`/port error → make sure code uses `process.env.PORT` (already done in our server.js)
- 401 from Key Vault → Managed Identity not granted role yet (go back to step A3)

**B5. Test all CRUD on live URL (45 min)**
- [ ] Create course (with video) ✓
- [ ] Verify Cosmos doc appears ✓
- [ ] Verify blob appears ✓
- [ ] Verify video plays in browser ✓
- [ ] Edit course ✓
- [ ] Add comment ✓
- [ ] Delete course ✓
- [ ] Verify cascade delete (blob also gone) ✓

**Checkpoint B:** Live app deployed, all CRUD working. **This alone scores ~70% (2:1).** Everything from here onwards lifts you into the High 1st band.

---

### Block C — Authentication setup (2 hours)

**C1. Update Entra ID app registration (15 min)**
- [ ] Go to your `edustream-auth` registration → Authentication
- [ ] Add SPA redirect URI: `https://edustream-app-<initials>.azurewebsites.net`
- [ ] Add SPA redirect URI: `http://localhost:3000`
- [ ] Save

**C2. Wire client ID into the frontend (45 min)**

The frontend reads `window.AZURE_CLIENT_ID` and `window.AZURE_TENANT_ID`. Inject these by adding a small route to `src/server.js` that returns a config script. Or simpler: add this script tag right before `</head>` in `public/index.html`, replacing the values:

```html
<script>
  window.AZURE_CLIENT_ID = 'YOUR-CLIENT-ID-HERE';
  window.AZURE_TENANT_ID = 'YOUR-TENANT-ID-HERE';
</script>
```

Commit and push:
```bash
git add public/index.html
git commit -m "Wire Entra ID client ID for SPA auth"
git push
```

GitHub Actions auto-deploys (watch in the Actions tab).

**C3. Test sign-in (30 min)**
- [ ] Visit your live URL
- [ ] Click "Sign in" — Entra ID popup appears
- [ ] Sign in with your Microsoft account
- [ ] Verify your name shows in the header
- [ ] Try creating a course — should succeed
- [ ] Sign out — verify create button now returns 401

**C4. Optional: Test from incognito to confirm 401 on unauth POST (30 min)**

---

## Day 2 (8 hours) — Polish, observability, video

### Block D — App Insights dashboards (2 hours)

**D1. Generate test data (15 min)**
- [ ] Sign in to your live app
- [ ] Create 5 courses (mix of with/without videos)
- [ ] Edit 2 of them
- [ ] Delete 1
- [ ] Add 5 comments across them
- [ ] Try uploading content with bad words (e.g. add "violence" to description) to trigger Content Moderator → should be blocked

This generates real telemetry App Insights can chart.

**D2. Build the dashboard (60 min)**
Follow `docs/APP_INSIGHTS_DASHBOARDS.md`:
- [ ] Open Application Insights → New dashboard
- [ ] Run each KQL query and pin the chart
- [ ] Arrange tiles cleanly
- [ ] Take screenshots of: Live Metrics, custom event chart, dependency performance, failure rate

**D3. Configure an alert (15 min)**
- [ ] App Insights → Alerts → New rule
- [ ] Signal: Failed requests > 5 in 5 min
- [ ] Action: email yourself
- [ ] Save

**D4. Verify Content Moderator is blocking (30 min)**
- [ ] Try posting a comment containing flagged content
- [ ] Should return 400 with "Content flagged by moderation"
- [ ] In App Insights Logs, run: `customEvents | where name == "ContentModerationBlocked"`
- [ ] Should show your blocked attempts — screenshot this

**Checkpoint D:** App Insights dashboard with 6 tiles, alerts configured, moderation actively blocking content. This is "expert-level integration adding significant value."

---

### Block E — Final polish (2 hours)

**E1. CDN verification (30 min)**
- [ ] Wait until CDN endpoint shows "Running" (provisioning takes up to 90 min after creation)
- [ ] Upload a new video
- [ ] Inspect the video URL in DevTools — should start with `https://edustream-videos-<initials>.azureedge.net`
- [ ] Verify it plays correctly via the CDN

**E2. README polish (30 min)**
- [ ] Update README.md with your live app URL
- [ ] Add a "Demo" section with a screenshot of the live app
- [ ] Push to GitHub

**E3. Pre-flight checklist (60 min)**
Run through this checklist clicking everything once. If anything fails, fix it now:

- [ ] Live app loads at `https://edustream-app-<initials>.azurewebsites.net`
- [ ] Sign-in works (Entra ID popup → returns to app signed in)
- [ ] Create course with video → succeeds, video plays via CDN
- [ ] Edit course → succeeds
- [ ] Add comment → succeeds
- [ ] Delete course → succeeds, video also removed
- [ ] Try to create without signing in → 401
- [ ] Try posting flagged comment → 400 with moderation reason
- [ ] App Insights Live Metrics shows traffic
- [ ] App Insights dashboard tiles all populated
- [ ] Custom events visible in Logs
- [ ] GitHub Actions latest run is green
- [ ] Resource Group shows all 10+ resources
- [ ] Cosmos Data Explorer shows your test data
- [ ] Blob container shows your videos
- [ ] Key Vault shows 4 secrets

If any of these fail, **stop and fix before recording.**

---

### Block F — Record video (3 hours, including retakes)

**F1. Pre-record setup (30 min)**
- [ ] Sign in to your live app, hit `/api/health` to wake F1 tier from sleep
- [ ] Open all browser tabs in this exact order:
  1. Live app (logged in)
  2. Resource Group
  3. App Service overview
  4. Cosmos Data Explorer
  5. Blob container
  6. Key Vault Secrets
  7. App Insights → your dashboard
  8. App Insights → Live Metrics
  9. GitHub repo → Actions tab
  10. Entra ID app registration
- [ ] Close all other tabs and apps
- [ ] Test mic and webcam in Panopto Capture
- [ ] Have a small video file ready to upload (~5 MB, named `demo.mp4`)
- [ ] Have a fresh course title written down: "High 1st Demo Course"

**F2. Read through the script once (15 min)**
See `docs/VIDEO_SCRIPT.md`. Practice the timing — aim for 4:30 (under 5:00 cap).

**F3. Record (45 min including retakes)**
- [ ] Open Panopto Capture from Blackboard
- [ ] Camera ON, screen sharing on
- [ ] Record. If you stumble in the first 30 seconds, restart immediately
- [ ] If you stumble after 2 minutes, keep going — small slips are okay

**F4. Review (15 min)**
- [ ] Watch the recording back at 1.25x to check pacing
- [ ] Check audio is clear
- [ ] Check screens are readable (zoom into Portal if not)

**F5. Re-record if needed (60 min buffer)**

---

### Block G — Submit (1 hour)

- [ ] Submit video via Panopto to the CW2 assignment area on Blackboard
- [ ] Final commit + push to GitHub (any last fixes)
- [ ] Verify the GitHub repo URL is in your video and/or submission notes
- [ ] **Stop your App Service after submission** (App Service → Stop) to save free credit
- [ ] Send yourself an email with: live URL, GitHub URL, video URL, screenshots

**Done.** 🎓

---

## What to skip if you're running over

If by end of Day 1 you're still struggling with deployment, drop these in this order:

1. **CDN** (saves 30 min) — videos still play directly from Blob URLs
2. **Custom App Insights dashboard** (saves 60 min) — built-in Live Metrics still demonstrates the feature
3. **Entra ID auth** (saves 90 min) — set `AUTH_ENABLED=false`, mention in video as "scoped out for time"

Do not skip:
- App Insights itself (the connection string env var is enough to get auto-instrumentation)
- Content moderation (works automatically once endpoint configured)
- Key Vault (Managed Identity is the centerpiece "expert level" demo)
- GitHub Actions CI/CD (already happens via Deployment Center anyway)
