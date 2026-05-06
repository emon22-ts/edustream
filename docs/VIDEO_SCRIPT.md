# Video script — High 1st target

**Time cap:** 5:00 (penalty kicks in at 5:30)
**Target length:** 4:40 (gives buffer for natural pauses)
**Style:** confident, professional, structured

The script systematically ticks every rubric criterion. Each section maps to a graded element.

---

## Pre-recording prep

Have these ready on disk:
- A short MP4 video (~5 MB, named `lecture.mp4`)
- 2-3 images (PNGs or JPGs, ~1 MB each, named `slide1.png`, `slide2.png`)
- An MP3 audio file (~3 MB, named `notes.mp3`)

Have these tabs open in this exact order:
1. Live app (signed in)
2. Resource group `edustream-rg`
3. App Service overview
4. Cosmos Data Explorer (Database edustream → Container courses → Items)
5. Storage account → Containers (showing all 3: videos, images, audio)
6. Key Vault → Objects → Secrets
7. App Insights → your dashboard
8. App Insights → Live Metrics
9. GitHub → your edustream repo → Actions tab

---

## [0:00 – 0:25] Opening (camera on)

> "Hi, I'm Mahfuzur Rahman Emon, student ID B00976168. This is my CW2 walkthrough for EduStream+ — a cloud-native multimedia learning platform built on Microsoft Azure. The platform supports three media types in a single course: video lectures, illustrated images, and audio recordings. I'll demonstrate the running app, walk through every Azure resource, and show the advanced features that go beyond the core requirements."

---

## [0:25 – 0:55] Resource group overview — *"Use of Azure Resources"*

**Switch to:** Resource Group tab

> "Everything is deployed under a single resource group. You can see ten distinct Azure services: App Service for compute, Cosmos DB for metadata, Blob Storage with three containers — one each for videos, images, and audio — Azure CDN for global delivery, Key Vault holding all secrets, Application Insights for telemetry, Microsoft Entra ID for authentication, and Azure AI Content Safety for moderation. This is a complete cloud-native stack."

---

## [0:55 – 2:45] Live demo — *"Implementation"*

**Switch to:** live app

> "Here's the running app. I'm signed in via Microsoft Entra ID. The interface uses an editorial design — Fraunces serif paired with Geist sans, deep navy with warm cream — to fit an academic context rather than a generic dashboard look."

**Action:** Scroll briefly through the library to show existing courses

> "Let me publish a new course."

**Action:** Fill in title "Foundations of Cloud Computing", instructor "Dr. Patel", description, category Technology, tags

**Action:** Drag all three files (video + 2 images + audio) into the dropzone

> "I'm uploading a video lecture, two slides, and an audio recording — all in one course. The frontend validates each file's type and size before submission, and the backend runs MIME-level validation again."

**Action:** Click Publish

> "On submission: text is screened by Content Safety, files are uploaded in parallel to their respective Blob containers, metadata is written to Cosmos with the CDN URLs, and custom telemetry events fire to App Insights."

**Action:** Course appears in the library with three media badges (🎬 1, 🖼️ 2, 🎵 1)

> "The course renders with tabs for each media type. Videos play through the embedded player. Images show in a gallery — clicking any one opens a lightbox. Audio plays inline."

**Action:** Click the Image tab, click an image, dismiss lightbox

**Action:** Click the Audio tab, briefly play

**Action:** Click Edit, change the title, OK

> "Editing hits the PUT endpoint with JWT validation."

**Action:** Try filtering library by 🎵 Audio pill

> "I can filter by media type — this query uses a secondary index on the Cosmos `mediaTypes` array."

**Action:** Reset filter, scroll to a course, post a comment

> "Comments are also moderated. Let me try one with flagged content."

**Action:** Type "this is hateful violent content", click Post

> "Content Safety blocks it with a category breakdown."

**Action:** Post a clean comment, succeeds

**Action:** Delete the course

> "Deletion cascades — the Cosmos document and all four blob files are removed in one operation."

---

## [2:45 – 3:30] Behind the scenes

**Switch to:** Cosmos Data Explorer

> "Here's the courses container. Each document holds an array of media items — each with its mediaType, container, blob URL, CDN URL, and original filename. The indexing policy excludes everything except the fields I actually query, including a secondary index on the mediaTypes array for type-based filtering."

**Action:** Open a document, scroll to show the media array

**Switch to:** Storage Containers

> "In Storage, three containers — videos, images, audio — each with its own lifecycle policy. Videos move to cool storage after 30 days, images after 60, audio after 45 — tuned per access pattern."

**Switch to:** Key Vault

> "No connection strings appear in App Service environment variables. All four secrets live in Key Vault. The App Service authenticates using its System-assigned Managed Identity. There are no keys hardcoded anywhere."

---

## [3:30 – 4:15] Advanced features — *"Use of Advanced Features"*

**Switch to:** App Insights dashboard

> "Application Insights is fully instrumented. This custom dashboard shows live request rate, response time percentiles, dependency call performance for Cosmos and Blob, and a custom funnel of business events — courses created, media uploaded, content moderation blocks, comments posted."

**Action:** Hover a tile

> "I've added custom metrics including media upload duration tagged by file count and total size."

**Switch to:** Live Metrics

> "Live Metrics in real-time."

**Switch to:** GitHub Actions tab

> "CI/CD runs through GitHub Actions on every push to main. Latest deploy is the green run two hours ago."

> "Authentication is via Microsoft Entra ID with MSAL.js on the frontend, validating JWTs against the Microsoft JWKS endpoint on the backend. Write operations require a valid token; reads remain anonymous so course discovery works without sign-in."

---

## [4:15 – 4:40] Limitations and CW1 mapping

**Switch to:** webcam

> "A note on design trade-offs. The CW1 design proposed Azure Functions per CRUD operation behind API Management. For phase 1, I consolidated these into Express to manage scope; the serverless decomposition is documented as next iteration. The implementation goes beyond CW1 in two ways: original design covered video only — this supports three media types — and adds Key Vault with Managed Identity, which is the production security pattern Microsoft recommends. Repo is on GitHub. Thanks for watching."

**Stop recording at 4:40–4:55.**

---

## Speaker tips for "highly professional"

- **Pace:** ~150 wpm. Script is ~700 words → fits in 4:40
- **Pauses:** half-second between sections, no "umm"
- **Energy:** smile in opening + closing, sit upright, look at camera
- **Clarity:** when on Portal, hover/click what you mention so viewer follows
- **Audio:** wired headset mic if possible
- **Lighting:** face a window or lamp
- **Background:** plain wall or tidy bookshelf
- **Dress:** smart casual

## What NOT to do

- ❌ Don't run through CW1 slides (the brief explicitly forbids this)
- ❌ Don't say "I didn't have time to..." — frame as deliberate scope decisions
- ❌ Don't read in monotone — paraphrase, glance at notes
- ❌ Don't go over 5:00

## Time penalties

| Length | Penalty |
|---|---|
| ≤ 5:00 | None |
| 5:00–5:30 | None |
| 5:30–6:00 | -10% on Video section |
| > 6:00 | -20% on Video section |
