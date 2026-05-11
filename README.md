# EduStream+

<div align="center">

**A cloud-native multimedia learning platform built on Microsoft Azure**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-c9711a?style=flat-square)](https://edustream-app-emon.azurewebsites.net)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=flat-square&logo=github-actions)](https://github.com/emon22-ts/edustream/actions)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Azure](https://img.shields.io/badge/Deployed%20on-Microsoft%20Azure-0078d4?style=flat-square&logo=microsoft-azure)](https://azure.microsoft.com)

</div>

---

## About

EduStream+ is a full-stack cloud-native platform where educators can publish multimedia courses combining **video lectures**, **illustrated notes**, and **audio recordings** — all in a single course. Built entirely on Microsoft Azure with production-grade security and observability.

> *"A cloud library of knowledge, delivered on demand."*

---

## Features

### Learning Platform
- Multi-media courses — video, images, and audio together in one course
- Course library — browse, search, filter by category and media type
- Explore page — grid view with sorting
- Course detail pages with custom video player
- Star ratings system
- Comments and discussion with content moderation
- Enroll system with progress tracking
- Course collections — group courses into learning paths

### Advanced Video Player
- Custom controls (play/pause, seek, volume)
- Playback speed control (0.5× to 2×)
- Keyboard shortcuts (Space=pause, →=+10s, ←=-10s)
- Auto-saves position — resumes where you left off
- Fullscreen support

### User Experience
- Profile pages — public profile with bio, stats, courses
- Personal dashboard — stats, leaderboard rank, activity timeline
- Live Rooms — real-time study rooms with text chat
- Notifications bell with activity feed
- Dark mode toggle
- Mobile responsive

### Cloud Architecture
- Direct-to-blob uploads — files go straight to Azure Blob Storage (supports 1GB+ videos, no timeout)
- SAS token generation — secure temporary upload URLs
- Content moderation — two-tier pipeline (Azure AI Content Safety + local fallback)
- Session authentication — secure login/register
- User accounts stored in Azure Table Storage

---

## Architecture

```
[Browser]
    │
    ├── API requests ──► [Azure App Service: Node.js + Express]
    │                         │
    │                         ├── [Azure Table Storage]
    │                         │   ├── courses
    │                         │   ├── comments
    │                         │   ├── enrollments
    │                         │   └── users
    │                         │
    │                         ├── [Azure Key Vault]
    │                         │   └── Managed Identity → no plaintext secrets
    │                         │
    │                         └── [Application Insights]
    │                             └── Custom KQL dashboard
    │
    └── Direct uploads ──► [Azure Blob Storage]
                               ├── /videos  (1GB limit)
                               ├── /images  (100MB limit)
                               └── /audio   (200MB limit)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 LTS |
| Framework | Express.js |
| Frontend | Vanilla JS SPA (custom router, no framework) |
| Database | Azure Table Storage (NoSQL) |
| File Storage | Azure Blob Storage |
| Secrets | Azure Key Vault + Managed Identity |
| Monitoring | Azure Application Insights |
| CI/CD | GitHub Actions |
| Hosting | Azure App Service (Linux) |
| Security | Helmet.js, rate limiting, content moderation |

---

## Azure Services

| Service | Purpose |
|---|---|
| App Service | Hosts Node.js API and SPA frontend |
| Table Storage | NoSQL database for all entities |
| Blob Storage | Video, image, audio file storage |
| Key Vault | Secrets via Managed Identity |
| Application Insights | Telemetry and custom dashboards |
| GitHub Actions | Automated CI/CD pipeline |

---

## Getting Started

### Prerequisites
- Node.js 22+
- Azure CLI
- Azure subscription

### Local Development

```bash
git clone https://github.com/emon22-ts/edustream.git
cd edustream
npm install
cp .env.example .env
# Add STORAGE_CONNECTION_STRING to .env
npm start
```

Open http://localhost:3000

### Azure Deployment

```bash
chmod +x scripts/setup-azure.sh
./scripts/setup-azure.sh
git push origin main  # CI/CD deploys automatically
```

---

## Security

- No plaintext secrets — all credentials in Azure Key Vault
- Managed Identity — passwordless authentication to Key Vault
- Content moderation — screens all user-submitted text
- Rate limiting — 30 write requests/min per IP
- Security headers — Helmet.js middleware
- Password hashing before storage
- SAS tokens — 2-hour expiry, scoped to single upload

---

## Project Structure

```
edustream/
├── src/
│   ├── server.js           # Entry point
│   ├── routes.js           # REST API endpoints
│   ├── config.js           # Key Vault config loader
│   ├── middleware/auth.js   # Session auth
│   └── services/
│       ├── tablestorage.js  # Azure Table Storage
│       ├── storage.js       # Azure Blob Storage
│       ├── sas.js           # SAS token generation
│       ├── moderator.js     # Content moderation
│       └── telemetry.js     # App Insights
├── public/
│   ├── index.html           # SPA shell
│   ├── css/main.css         # Design system
│   ├── js/app.js            # Router + shared utilities
│   └── pages/
│       ├── home.js
│       ├── explore.js
│       ├── course.js
│       ├── dashboard.js
│       ├── profile.js
│       ├── collections.js
│       └── liverooms.js
└── scripts/setup-azure.sh   # Azure provisioning
```

---

## REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/courses` | List courses |
| POST | `/api/courses` | Create course |
| GET | `/api/courses/:id` | Get course |
| PUT | `/api/courses/:id` | Update course |
| DELETE | `/api/courses/:id` | Delete course |
| GET | `/api/courses/:id/comments` | List comments |
| POST | `/api/courses/:id/comments` | Post comment |
| POST | `/api/courses/:id/enroll` | Enroll |
| POST | `/api/upload/sas` | Get upload SAS token |
| POST | `/api/upload/confirm` | Confirm direct upload |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |

---

## Design

Editorial academic aesthetic:
- **Type:** Fraunces (serif) + Geist (sans)
- **Colours:** Navy `#0e1a2b` · Cream `#f5edd8` · Amber `#c9711a`
- **Modes:** Light and dark theme
- **Layout:** Responsive, sidebar collapses on mobile

---

## Author

**Mahfuzur Rahman Emon**  
[github.com/emon22-ts](https://github.com/emon22-ts)

---

## License

MIT
