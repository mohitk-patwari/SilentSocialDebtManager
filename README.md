# Silent Social Debt Manager

> Autonomous AI agent that eliminates forgotten follow-ups, unanswered messages, and broken relationship commitments.

**PRISM Hackathon · OpenClaw Track · Theme 2: Daily Utility**

## 🎯 Project Overview

Silent Social Debt Manager monitors your conversations across **WhatsApp**, **Telegram**, and **Gmail** in real-time. It uses NLP classification, relationship memory (SOUL.md), and autonomous scheduling (HEARTBEAT) to:

- 🤖 **Identify unanswered queries** and classify relationship signals
- 💾 **Maintain persistent relationship memory** for each contact
- 📊 **Score and prioritize** follow-ups by relationship weight and urgency
- ⏰ **Autonomously trigger actions** every 30 minutes (draft replies, nudges, silent logs)
- 📱 **Provide a dashboard** to review, approve, or dismiss AI-generated actions

All without requiring user prompts — the system runs in the background.

## 📦 Project Structure

```
SilentSocialDebtManager/
├── packages/
│   ├── backend/              # Node.js/TypeScript backend
│   │   ├── src/
│   │   │   ├── gateway/      # Message ingestion (OpenClaw Gateway)
│   │   │   ├── nlp/          # Classification, extraction, tone, draft generation
│   │   │   ├── memory/       # SOUL.md store (persistent contact profiles)
│   │   │   ├── scheduler/    # HEARTBEAT daemon + scoring engine
│   │   │   ├── api/          # REST API + WebSocket server
│   │   │   ├── shared/       # TypeScript interfaces
│   │   │   └── config/       # Environment & configuration
│   │   └── tests/            # Unit, integration, E2E tests
│   ├── frontend/             # React + Vite + TailwindCSS dashboard
│   │   ├── src/
│   │   │   ├── components/   # Debt queue, profiles, action log, modals
│   │   │   ├── hooks/        # Custom hooks (WebSocket, queue state)
│   │   │   ├── pages/        # Dashboard page
│   │   │   └── types/        # Frontend TypeScript types
│   │   └── index.html
│   └── shared/               # Shared types & interfaces (for both backend & frontend)
└── docs/                     # Architecture, API contracts, SOUL schema
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 20 LTS**
- **TypeScript 5.x**
- API keys:
  - **Anthropic** (for Claude 3.5 Sonnet)
  - **WhatsApp Business** (Meta Business App)
  - **Google Cloud** (Gmail API + OAuth)
  - **Telegram** (@BotFather)

### Setup

1. **Clone & install dependencies:**
   ```bash
   git clone <repo-url>
   cd SilentSocialDebtManager
   yarn install
   ```

2. **Configure environment variables:**
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   # Edit packages/backend/.env with your API keys
   ```

3. **Build all packages:**
   ```bash
   yarn build
   ```

4. **Start backend & frontend (dev mode):**
   ```bash
   yarn dev
   ```

   Or separately:
   ```bash
   # Terminal 1: Backend
   cd packages/backend && yarn dev
   
   # Terminal 2: Frontend
   cd packages/frontend && yarn dev
   ```

5. **Visit dashboard:**
   - Backend API: `http://localhost:3000`
   - Frontend Dashboard: `http://localhost:5173`

## 📋 Key Features

### 1. **Multi-Channel Ingestion (OpenClaw Gateway)**
- WhatsApp Business API webhooks
- Telegram Bot polling
- Gmail API (OAuth 2.0)
- Unified `MessageEvent` schema

### 2. **NLP Classification Engine**
- `unanswered_query` — Direct question needing reply
- `commitment_made` — Explicit or implicit promise detected
- `relationship_drift` — No contact for 30+ days
- `neutral` — Logged but no action needed

### 3. **Persistent Relationship Memory (SOUL.md)**
Each contact stored as:
```markdown
# Alice Smith — SOUL.md
relationship_weight: 0.85
last_contact: 2024-01-15T14:30:00Z
health_score: 72 / 100
tone_profile: professional, concise

## Open Commitments
- [ ] Send project notes by Friday

## Interaction Log
- 2024-01-15 | unanswered_query | score: 0.78 | DRAFT generated
```

### 4. **Autonomous Scheduler (HEARTBEAT)**
- Runs every 30 minutes (configurable)
- Reads priority queue; scores based on:
  - **Urgency weight** (commitment_made: 1.5, unanswered_query: 1.2, etc.)
  - **Relationship weight** (0.0–1.0)
  - **Time decay** (log₂ of hours since last contact)
- Dispatches actions: `NUDGE`, `DRAFT`, `SILENT_LOG`
- Idempotent: skips duplicate actions within 2 hours

### 5. **LLM Abstraction Layer**
- **Primary:** Claude 3.5 Sonnet (Anthropic)
- **Alternative:** GPT-4o (OpenAI) — drop-in via ENV var
- Operations:
  - Classification with confidence scores
  - Commitment extraction (explicit + implicit)
  - Tone detection (professional, casual, urgent, emotional)
  - Draft reply generation with tone matching

### 6. **Dashboard (React + WebSocket)**
- **Debt Queue View:** Pending actions sorted by score
- **Contact Profile View:** SOUL.md profile visualization
- **Action Log:** Chronological HEARTBEAT actions
- **Draft Review Modal:** Approve / edit / dismiss drafts
- **Live Updates:** WebSocket push from backend

## 🧪 Testing

```bash
# Run all tests
yarn test

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage

# Type checking
yarn type-check
```

## 📖 Documentation

See `/docs` folder:
- `ARCHITECTURE.md` — System design & data flow
- `API_CONTRACT.md` — REST API endpoints & types
- `SOUL_SCHEMA.md` — Contact profile schema detail
- `LLM_PROVIDERS.md` — Provider implementation guide
- `DEMO_SCRIPT.md` — End-to-end demo walkthrough

## 🤝 Team Roles

| Member | Focus | Owns |
|---|---|---|
| **Member 1** | Backend & Integration | Gateway, channel adapters, REST API, WebSocket |
| **Member 2** | AI & NLP | Classification, extraction, tone, reply drafting |
| **Member 3** | Memory & Scheduler | SOUL.md store, HEARTBEAT, scoring, health score |
| **Member 4** | Frontend, QA & Demo | React dashboard, E2E tests, pitch deck, demo |

## 📝 Definition of Done

- [x] Directory structure created
- [ ] All three channels ingesting real test messages
- [ ] NLP correctly classifying `unanswered_query` and `commitment_made`
- [ ] HEARTBEAT firing autonomously
- [ ] SOUL.md persisting correctly after actions
- [ ] At least one tone-matched draft generated
- [ ] Dashboard live-updating within 1 second
- [ ] 6 E2E tests passing
- [ ] README complete (enables setup in <10 min)
- [ ] Pitch deck polished & approved
- [ ] Demo video recorded

## 📞 Support

For questions or blockers, reach out via:
- Slack: #ssdm-dev
- Discord: PRISM Hackathon server

---

**Built for PRISM Hackathon 2026 · OpenClaw Track · Theme 2: Daily Utility**
