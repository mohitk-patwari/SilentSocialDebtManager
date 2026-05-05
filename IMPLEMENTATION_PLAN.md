# Silent Social Debt Manager — Implementation Plan

> **Project:** Silent Social Debt Manager
> **Track:** PRISM Hackathon · OpenClaw Track · Theme 2: Daily Utility

---

## 1. Executive Summary

Silent Social Debt Manager is an autonomous AI agent that eliminates forgotten follow-ups, unanswered messages, and broken relationship commitments. It operates across **WhatsApp**, **Telegram**, and **Gmail** using NLP, priority scoring, persistent relationship memory (SOUL.md), and a cron-based autonomous scheduler (HEARTBEAT) — all without requiring user prompts.

---

## 2. System Architecture

The system is composed of **five distinct architectural layers**, each with bounded responsibilities:

| Component | Responsibility | Inputs | Outputs |
|---|---|---|---|
| **OpenClaw Gateway** | Unified entry point; normalises and deduplicates messages | WhatsApp webhooks, Telegram polling, Gmail push/pull | `MessageEvent` objects on internal queue |
| **NLP Classification Engine** | Classifies each event as `unanswered_query`, `commitment_made`, `relationship_drift`, or `neutral` | `MessageEvent` from queue | `ClassifiedEvent` with type, confidence, entities |
| **Priority Scoring Engine** | Computes priority score; maintains ranked action queue | `ClassifiedEvent` + SOUL.md relationship weight | `ActionItem` in priority queue |
| **HEARTBEAT Scheduler** | Cron daemon (default: every 30 min); reads top-N items and fires actions | Priority queue + config | NUDGE / DRAFT / SILENT_LOG actions |
| **LLM Layer** | Generates tone-matched draft replies using SOUL.md context | `ActionItem` + SOUL.md profile | `DraftReply` or `CommitmentSummary` |
| **SOUL.md Memory Store** | Flat Markdown files per contact; stores interaction history, commitments, health score | Post-action writes from HEARTBEAT | Updated SOUL.md profiles |
| **Dashboard (Frontend)** | Web UI for debt queue, profiles, action log, and manual overrides | REST API + WebSocket | Visual interface |

---

## 3. End-to-End Data Flow

1. **Message Ingestion** — Gateway normalises incoming message into `MessageEvent { id, channel, sender, content, timestamp, thread_id }`
2. **Classification** — LLM classifies message type; extracts explicit promises
3. **Relationship Context Lookup** — Scoring engine reads sender's SOUL.md for `relationship_weight`, `last_contact`, `open_commitments[]`
4. **Priority Scoring** — `Score = urgency_weight(type) × relationship_weight × log₂(elapsed_hours + 1)`
5. **HEARTBEAT Evaluation** — Every 30 min, reads top-N items above threshold; decides NUDGE / DRAFT / SILENT_LOG
6. **LLM Action Execution** — For DRAFT actions, generates tone-matched reply using SOUL.md context
7. **Memory Write** — Interaction appended to SOUL.md; health score updated
8. **Dashboard Sync** — Backend pushes updated queue state via WebSocket

---

## 4. Priority Scoring Formula

```
Priority Score = urgency_weight(type) × relationship_weight × log₂(elapsed_hours + 1)
```

| Event Type | urgency_weight | Rationale |
|---|---|---|
| `commitment_made` | 1.5 | Explicit promise — highest stakes |
| `unanswered_query` | 1.2 | Direct question requires reply |
| `relationship_drift` | 0.8 | No recent contact — grows slowly |
| `neutral` | 0.3 | Logged but rarely triggers action |

---

## 5. SOUL.md Schema

```markdown
# [Contact Name] — SOUL.md
relationship_weight: 0.85
last_contact: 2024-01-15T14:30:00Z
health_score: 72 / 100
tone_profile: professional, concise

## Open Commitments
- [ ] Send project notes by Friday (detected 2024-01-14)

## Interaction Log
- 2024-01-15 │ unanswered_query │ score: 0.78 │ DRAFT generated
```

**Health Score Algorithm:**
- Starts at 100
- Decays −5 points/week without contact
- Restored +10 per interaction
- Penalised −20 per broken commitment
- Drift event triggered when `health_score < 40` or `last_contact > 30 days`

---

## 6. Technology Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Language | TypeScript | 5.x, strict mode |
| LLM — Primary | Claude 3.5 Sonnet (Anthropic) | Via Anthropic API |
| LLM — Alt | OpenAI GPT-4o / LLaMA 3 | Drop-in via abstraction layer |
| Memory Store | SOUL.md (flat Markdown) | One file per contact |
| Scheduler | HEARTBEAT (node-cron) | Configurable interval |
| Channel — WhatsApp | WhatsApp Business API (Meta) | Requires BSP approval |
| Channel — Telegram | Telegram Bot API | Free, no approval needed |
| Channel — Gmail | Gmail API v1 (Google Cloud) | OAuth 2.0 required |
| Backend API | Express.js / Fastify | REST + WebSocket |
| Frontend | React + Vite + TailwindCSS | SPA, served statically |
| Testing | Jest + Supertest | Unit + integration tests |
| DevOps | GitHub + dotenv | CI/CD, secret management |

---

## 7. LLM Abstraction Layer

All LLM calls route through a single interface, allowing provider swaps without downstream changes:

```typescript
interface LLMProvider {
  classify(message: string): Promise<ClassificationResult>;
  extractCommitments(message: string): Promise<Commitment[]>;
  draftReply(context: ReplyContext): Promise<DraftReply>;
  detectTone(message: string): Promise<ToneProfile>;
}
```

---

## 8. External API Integrations

| Channel | Auth Method | Data Retrieved | Limitations |
|---|---|---|---|
| **WhatsApp** | API Key + Phone Number ID | Inbound messages, delivery receipts, contact names | Requires BSP approval; 24hr outbound window |
| **Telegram** | Bot Token via @BotFather | All messages in monitored chats, user metadata | Bot must be added to each chat; no historic messages |
| **Gmail** | OAuth 2.0 (`gmail.readonly`, `gmail.modify`) | Full threads, labels, sender metadata, attachments | 250 quota units/sec; refresh token management required |

---

## 9. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/queue` | Returns current priority queue |
| GET | `/api/contacts` | Returns SOUL.md contact summaries |
| POST | `/api/action/:id/approve` | User approves a draft |
| POST | `/api/action/:id/dismiss` | User dismisses an action |
| WS | `/ws` | Live queue push to Dashboard |

---

## 10. Inter-Member Interface Contracts

These must be committed to the repo by **end of Phase 1 (Hour 4)**:

| Interface | Producer | Consumer(s) | Due | Contract |
|---|---|---|---|---|
| `MessageEvent` type | Member 1 | Members 2, 3 | Phase 1 Gate | `shared/types.ts`; committed by Hour 4 |
| `ClassifiedEvent` type | Member 2 | Member 3 (scoring) | Phase 1 Gate | Extends `MessageEvent`; committed by Hour 4 |
| `SOULProfile` type | Member 3 | Members 2 (LLM), 4 (UI) | Phase 1 Gate | TypeScript type + `getProfile()` mock by Hour 4 |
| `ActionItem` type | Member 3 | Members 1 (dispatch), 4 (UI) | Phase 2 Gate | With score, type, contact_id, event ref; by Hour 10 |
| REST API contract | Member 1 | Member 4 (Dashboard) | Phase 2 Gate | OpenAPI/Postman collection in `/docs` by Hour 10 |

---

## 11. Sprint Timeline (16 Hours)

| Phase | Hours | Focus |
|---|---|---|
| **Phase 1 — Foundation** | 0–4 | Scaffold all modules; define all TypeScript interfaces; lock inter-member contracts |
| **Phase 2 — Core Build** | 4–10 | All channel adapters ingesting; NLP classification passing tests; SOUL.md read/write; Dashboard views with real data |
| **Phase 3 — Integration** | 10–14 | REST API + WebSocket live; HEARTBEAT running in dry-run; all layers connected end-to-end; 6 E2E tests passing |
| **Phase 4 — Polish & Demo** | 14–16 | Bug fixes; demo data seeding; prompt tuning; HEARTBEAT at 5-min demo interval; pitch deck polished; README complete |

---

## 12. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| WhatsApp API approval delayed | High | Use `baileys` (unofficial WA library) as fallback; note in README |
| Gmail OAuth setup takes too long | Medium | Complete OAuth setup in first 2 hours; use dedicated test Google account |
| LLM rate limits during demo | Medium | Implement response caching; pre-cache all demo message classifications |
| SOUL.md corruption under concurrent writes | Low | Atomic writes (write to `.tmp`, then rename) from Hour 2 |
| Member 1 ↔ Member 2 integration breaks in Phase 3 | Medium | TypeScript interfaces locked by Hour 4; 15-min live debug session on shared Slack if needed |
| Dashboard too complex to finish | Medium | Ship minimal `DebtQueueView` first; additional views are stretch goals |

---

## 13. Definition of Done

The project is submission-ready when all of the following are verified:

- [ ] All three channels ingest at least one real test message without errors
- [ ] NLP correctly identifies at least one `unanswered_query` and one `commitment_made` from live messages
- [ ] HEARTBEAT fires autonomously and dispatches correct action type for top-scored items
- [ ] SOUL.md is updated after every HEARTBEAT action; profile reads back correctly
- [ ] At least one tone-matched draft reply is generated and visible in the Dashboard
- [ ] Dashboard `DebtQueueView` shows live updates within 1 second of backend change
- [ ] All 6 E2E tests pass with a single `npm test` on a clean clone
- [ ] README enables a fresh team member to clone, configure `.env`, and run the project within 10 minutes
- [ ] Pitch deck has no placeholder text; all 7 slides reviewed and approved by all members
- [ ] Backup demo video recorded and playable