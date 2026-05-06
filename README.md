# EduStream+

> A cloud-powered academic streaming platform — share **video lectures**, **illustrated notes**, and **audio recordings** in a single course.

**Module:** Cloud Native Development (COM682) | **Author:** Mahfuzur Rahman Emon | **Student ID:** B00976168

---

## Multi-media support

Each course can hold up to **5 media items** mixed across three types:

| Type | Container | Max size | Formats |
|---|---|---|---|
| 🎬 Video | `videos` | 100 MB | mp4, webm, ogg, mov, mkv |
| 🖼️ Image | `images` | 20 MB | jpeg, png, gif, webp, svg |
| 🎵 Audio | `audio` | 50 MB | mp3, wav, ogg, m4a, aac |

The frontend renders each type appropriately:
- **Video** — embedded HTML5 player with multi-video tabs
- **Image** — gallery grid with click-to-zoom lightbox
- **Audio** — native audio controls with file labels

---

## Architecture

EduStream+ is a cloud-native multimedia learning platform built on Microsoft Azure.

### Azure resources

| Service | Purpose | Tier |
|---|---|---|
| App Service (Linux, Node 20) | Hosts the Express API and SPA frontend | Free F1 |
| Azure Table Storage (NoSQL) | Stores courses, comments, enrollments | Pay-per-request |
| Azure Blob Storage (3 containers) | Stores videos, images, audio | Standard LRS |
| Azure CDN | Globally caches media delivery | Standard Microsoft |
| Key Vault | Stores secrets via Managed Identity | Standard |
| Application Insights | Telemetry, distributed tracing, dashboards | Pay-as-you-go |
| Microsoft Entra ID | User authentication for write operations | Free |
| Azure AI Content Safety | Screens uploads (with word-list fallback) | Free F0 / fallback |
| GitHub Actions | CI/CD pipeline | — |

### Why Table Storage instead of Cosmos DB

Both are Azure NoSQL services. **Table Storage** was chosen for this implementation because:

1. **Cost-efficient** — pay-per-request billing (~£0.04/GB/month) with no minimum throughput, ideal for a coursework deployment with bursty traffic.
2. **Universal availability** — works on every Azure subscription including student/free tiers, where Cosmos DB has regional restrictions.
3. **Simpler credential model** — shares the same connection string as Blob Storage, reducing the Key Vault secret count and simplifying Managed Identity wiring.
4. **Sufficient for this domain model** — partition-key/row-key schema fits courses (PK=`course`, RK=courseId), comments (PK=courseId for query locality), and enrollments (PK=userId).

Migrating to Cosmos DB would be a phase-2 step if global distribution, geo-redundancy, or richer query patterns become necessary. The application's data layer is abstracted behind a `Courses`/`Comments`/`Enrollments` interface so this swap requires no route changes.

### Data flow

```
[User] → [CDN] → [App Service: Express + SPA]
                       ↓             ↓
                  [Key Vault]   [App Insights]
                       ↓
        ┌──────────────┼─────────────────┐
   [Table Storage]  [Blob Storage]   [Content Safety]
   ├─ courses        ├─ videos/      (or word-list
   ├─ comments       ├─ images/       fallback)
   └─ enrollments    └─ audio/
```

The App Service uses Managed Identity to authenticate to Key Vault, eliminating connection strings from environment variables in production.

---

## REST API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| GET | `/api/media-types` | — | List supported media types and limits |
| GET | `/api/courses` | — | List (`?search=`, `?category=`, `?mediaType=`) |
| GET | `/api/courses/:id` | — | Get one course |
| POST | `/api/courses` | required | Create course (multipart, up to 5 mixed media) |
| PUT | `/api/courses/:id` | required | Update course metadata |
| POST | `/api/courses/:id/media` | required | Add media to existing course |
| DELETE | `/api/courses/:id/media/:blobName` | required | Remove a single media item |
| DELETE | `/api/courses/:id` | required | Delete course (cascades to all media) |
| GET | `/api/courses/:id/comments` | — | List comments |
| POST | `/api/courses/:id/comments` | required | Add comment (moderated) |
| DELETE | `/api/comments/:id` | required | Delete comment |
| POST | `/api/courses/:id/enroll` | required | Enroll current user |
| GET | `/api/users/me/enrollments` | required | Current user's enrollments |
| GET | `/api/auth/status` | — | Check auth configuration |

---

## Local development

```bash
git clone https://github.com/YOUR_USERNAME/edustream.git
cd edustream
npm install
cp .env.example .env
# Edit .env with your Azure storage connection string
npm start
```

Open http://localhost:3000

---

## Frontend design

The interface uses an **editorial / academic** aesthetic — distinct from the standard SaaS dashboard look:

- **Type pairing:** Fraunces (display serif) + Geist (geometric sans) + Geist Mono (technical labels)
- **Palette:** deep navy (#0e1a2b), warm cream (#f4ecdc), amber accent (#c9711a), burgundy alerts (#8a2433)
- **Layout:** newspaper-style nameplate header, hero with editorial pull-quote, two-column library + upload panel
- **Touches:** italic by-lines, dashed dividers, subtle paper-grain background, fade-up animation on course entries

---

## Content moderation strategy

Two-tier moderation pipeline:
1. **Cloud tier** — Azure AI Content Safety analyses text against four severity levels across Hate, SelfHarm, Sexual, and Violence categories
2. **Fallback tier** — local word-list moderation for environments where Content Safety isn't available (e.g. student subscriptions with Cognitive Services restrictions)

The moderator service automatically falls through from cloud to fallback. This graceful degradation pattern is itself an example of cloud-native resilience — the application stays functional even when an external dependency is unavailable.

---

## Security posture

- All secrets stored in Key Vault (no plaintext in environment variables in production)
- Managed Identity used for App Service → Key Vault authentication
- HTTPS-only on App Service
- Helmet middleware for security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting on write operations (30/min per IP)
- JWT validation via JWKS for Entra ID tokens
- MIME validation on every upload
- Content moderation on all user-supplied text
- CORS configured

---

## Observability

Custom telemetry events tracked in App Insights:
- `CourseCreated` (with mediaCount, mediaTypes)
- `CourseViewed`, `CourseUpdated`, `CourseDeleted`
- `MediaAdded`, `MediaRemoved`
- `CommentPosted`
- `UserEnrolled`
- `ContentModerationBlocked` (with provider tier and category)
- `ApiError`

Custom metrics:
- `ApiRequestDuration` (per route, per status)
- `MediaUploadDuration` (with file count and total size dimensions)

---

## CW1 design → CW2 implementation mapping

| CW1 design element | CW2 implementation |
|---|---|
| Azure Functions per CRUD operation | Express routes on App Service (consolidated for phase 1) |
| API Management gateway | Express middleware (CORS, rate limit, auth, helmet) |
| Cosmos DB | **Table Storage** (cost-effective NoSQL for student deployment) |
| Azure SQL DB | Folded into Table Storage for phase 1 |
| Blob Storage (video only) | ✅ **Extended to three media types** |
| Azure CDN | ✅ Implemented |
| Static Web App frontend | Served from same App Service |
| App Insights + Power BI | ✅ App Insights with custom dashboards |
| Content Moderator | ✅ AI Content Safety + word-list fallback |
| Azure AI Search | Future work (phase 2) |
| Azure AD authentication | ✅ Microsoft Entra ID with MSAL.js |
| Key Vault for secrets | ✅ Implemented with Managed Identity |

The implementation goes **beyond** the CW1 design in three ways:
1. **Multi-media:** original design covered video only; CW2 adds image + audio
2. **Production security:** Key Vault + Managed Identity weren't in CW1 but are essential
3. **Resilient moderation:** two-tier strategy with graceful fallback

---

## Future work (phase 2)

- Migrate from Table Storage to Cosmos DB for global distribution
- Decompose into Azure Functions per CRUD operation behind API Management
- Add Azure AI Search for semantic course discovery
- Power BI dashboards on App Insights data
- Image thumbnail generation via Azure Functions
- Audio transcription via Azure AI Speech for searchable lectures
