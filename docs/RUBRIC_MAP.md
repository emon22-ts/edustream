# Rubric → Evidence map

This document maps every CW2 rubric criterion to a specific piece of evidence in the build. Use it as a final checklist before recording.

---

## Implementation (35%)

**Target band:** "Exceptional and innovative implementation with all components expertly integrated and functional" (80-100%)

| Required evidence | Where to find it |
|---|---|
| All CRUD operations functional | Demo: Create, Read (list + single), Update (PUT), Delete on live URL |
| Components well-integrated | Course creation triggers: moderation → blob upload → Cosmos write → telemetry → CDN URL response (all in one request) |
| Cascading delete | Deleting a course removes both Cosmos doc AND Blob file |
| Error handling | Try invalid input → see structured JSON error response |
| Innovation | Auth-gated writes, anonymous reads (RBAC pattern); content moderation pre-write; managed identity for secrets |

**Video moments that score:** 0:50–2:30

---

## Use of Azure Resources (35%)

**Target band:** "Masterful use of Azure resources with flawless deployment and integration" (80-100%)

| Resource | Evidence of "masterful" use |
|---|---|
| App Service | Linux Node 20, HTTPS-only, Managed Identity enabled, environment variables driving config, App Insights auto-instrumented, GitHub Actions CI/CD |
| Cosmos DB | Free tier applied, three containers with appropriate partition keys, **tuned indexing policy excluding all fields except those queried**, schema documented in README |
| Blob Storage | Anonymous read access on `videos` container, **lifecycle policy moving cold blobs to Cool tier after 30 days**, cache headers set for CDN compatibility |
| Azure CDN | Pointed at Blob origin, Standard Microsoft tier, video URLs rewritten in API responses |
| Key Vault | RBAC mode (not access policies), **App Service Managed Identity granted Secrets User role**, four secrets stored, application loads at startup with env-var fallback |
| App Insights | **Custom dashboard with 6 KQL-driven tiles**, custom events tracked for domain operations, custom metrics with dimensions, alert rule configured |
| Entra ID | App registration with SPA redirect, custom scope (`access_as_user`), JWKS-based token validation on backend |
| Content Safety | Free tier, four categories enabled (Hate, SelfHarm, Sexual, Violence), severity threshold tuned to medium |
| GitHub Actions | OIDC federated credentials (no long-lived secrets), build → test → deploy pipeline |

**Video moments that score:** 0:20–0:50, 2:30–3:30

**Standout integration patterns to mention in video:**
1. "All secrets in Key Vault, accessed via Managed Identity — no connection strings in plaintext"
2. "Cosmos indexing policy excludes unused fields — keeps RU costs low at scale"
3. "Blob lifecycle policy auto-tiers cold videos to save cost"
4. "Custom App Insights events drive a business-metric dashboard, not just request counts"

---

## Use of Advanced Features (20%)

**Target band:** "Advanced features integrated at an expert level, adding significant value" (80-100%)

Six advanced features integrated:

| Feature | Significant value | Where demonstrated |
|---|---|---|
| Application Insights with custom dashboard | Operational observability, real-time monitoring, alerting | Video 3:30–3:50 |
| Microsoft Entra ID authentication | Production-grade identity, JWT validation, RBAC-ready | Video 1:00, 4:00 |
| Azure Key Vault + Managed Identity | Eliminates plaintext secrets, the production security pattern | Video 3:15 |
| Azure AI Content Safety | Automated moderation pre-publication, four severity levels, four categories | Video 1:50 |
| Azure CDN | Global low-latency video delivery, cache-tuned blob headers | Video 1:30 |
| GitHub Actions CI/CD | Push-to-deploy workflow with smoke test stage | Video 4:00 |

**Why this scores high:** The rubric distinguishes "good functionality" from "expert level adding significant value." Mentioning Managed Identity, JWKS validation, lifecycle policies, custom KQL dashboards — these are vocabulary that signals expert-level use.

---

## Video Quality and Presentation (10%)

**Target band:** "Exemplary video with clear, well-structured presentation, highly professional" (80-100%)

| Criterion | How achieved |
|---|---|
| Within time limit | Target 4:30–4:50, hard cap 5:00 |
| Clear structure | Opening → Resources → Demo → Behind-scenes → Advanced → Closing |
| Camera on | Opening and closing on camera |
| Audio quality | Headset mic, quiet room |
| Visuals readable | Browser zoomed appropriately, Portal text legible |
| Smooth pacing | Rehearsed once, no script-reading monotone |
| Demonstrates everything claimed | Each Azure service shown briefly, each advanced feature working live |
| Professional opening | Name, ID, project name in first 20 seconds |

---

## Final pre-submission checklist

Print this and tick each item before submitting:

### Live application
- [ ] App loads at production URL
- [ ] HTTPS works (no certificate warnings)
- [ ] All CRUD operations work end-to-end
- [ ] Sign-in popup works
- [ ] Video upload + playback work
- [ ] Comments + moderation work
- [ ] Delete cascades to blob

### Azure resources
- [ ] All 10 resources visible in resource group
- [ ] App Service uses Managed Identity (not connection strings)
- [ ] Key Vault has all 4 secrets
- [ ] App Service can read from Key Vault (check logs)
- [ ] App Insights collecting data (Live Metrics shows traffic)
- [ ] Custom dashboard has 6 tiles
- [ ] Alert rule active
- [ ] CDN endpoint serving videos

### Code & docs
- [ ] GitHub repo public and accessible
- [ ] README has architecture and setup
- [ ] No secrets committed (`.env` in `.gitignore`)
- [ ] Latest GitHub Actions run is green
- [ ] AZURE_SETUP.md included for reproducibility

### Video
- [ ] Recorded with camera on
- [ ] Under 5:00
- [ ] Audio clear
- [ ] Each Azure service shown
- [ ] Each advanced feature demonstrated
- [ ] Submitted to Panopto assignment area

If every box is ticked, you've maximised your score against this rubric.
