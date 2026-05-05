# Silent Social Debt Manager — Division of Work

> **Project:** Silent Social Debt Manager
> **Track:** PRISM Hackathon · OpenClaw Track · Theme 2: Daily Utility

---

## Team Overview

| Member | Role | Owns |
|---|---|---|
| **Member 1** | Backend & Integration Lead | OpenClaw Gateway, all three channel API connectors, message ingestion pipeline, unified event schema |
| **Member 2** | AI & NLP Engineer | NLP classification engine, commitment extraction, LLM abstraction layer, tone detection, reply draft generation |
| **Member 3** | Memory & Scheduler Systems | SOUL.md schema and read/write layer, HEARTBEAT cron daemon, priority scoring engine, action queue management |
| **Member 4** | Frontend, QA & Demo Lead | React dashboard UI, REST/WebSocket API consumption, end-to-end testing, pitch deck, README, demo script |

---

## Member 1 — Backend & Integration Lead

### OpenClaw Gateway Setup
- Scaffold the Node.js/TypeScript Gateway module
- Define the unified `MessageEvent` TypeScript interface
- Implement a message queue (in-memory EventEmitter or Redis-backed)
- Write channel adapter interface (`IChannelAdapter`) all connectors must implement
- Implement deduplication by message ID to prevent double-processing

**Tech:** Node.js 20, TypeScript 5, EventEmitter / Redis
**Deliverable:** Fully functional Gateway that normalises events from all channels into `MessageEvent` objects

### WhatsApp Integration
- Register a Meta Business App and obtain Phone Number ID + API key
- Implement webhook endpoint to receive inbound WhatsApp messages
- Handle webhook verification (GET challenge from Meta)
- Parse message payload: text, media, interactive, and status updates
- Map to `MessageEvent` and emit to internal queue
- Implement outbound send for HEARTBEAT-triggered nudges and drafts

**Tech:** WhatsApp Business API, Express.js, ngrok (dev)
**Deliverable:** WhatsApp adapter passing inbound messages to queue; outbound send working

### Telegram Integration
- Create bot via @BotFather; store Bot Token in `.env`
- Implement long-polling loop (or set webhook for production)
- Parse Telegram `Update` objects: message, edited_message, channel_post
- Extract sender, chat_id, text, and timestamp
- Map to `MessageEvent` and emit to queue
- Implement `sendMessage` for HEARTBEAT outbound nudges

**Tech:** Telegram Bot API, node-telegram-bot-api, TypeScript
**Deliverable:** Telegram adapter; messages arriving in queue within 5s of send

### Gmail Integration
- Set up Google Cloud project; enable Gmail API
- Implement OAuth 2.0 flow with offline access (refresh token storage)
- Implement polling strategy: list messages with `q=is:unread`, fetch full thread
- Extract sender email, subject, body snippet, thread_id, timestamp
- Map to `MessageEvent`; flag thread-level context for NLP
- Handle token refresh automatically; log auth errors clearly

**Tech:** Gmail API v1, Google Auth Library, OAuth 2.0
**Deliverable:** Gmail adapter; all unread messages surfaced as `MessageEvent`s with thread context

### Backend REST API
- Scaffold Express/Fastify server with TypeScript
- Expose `GET /api/queue` — returns current priority queue
- Expose `GET /api/contacts` — returns list of SOUL.md contact summaries
- Expose `POST /api/action/:id/approve` — user approves a draft
- Expose `POST /api/action/:id/dismiss` — user dismisses an action
- Add WebSocket endpoint for live queue push to Dashboard

**Tech:** Express.js, ws (WebSocket), TypeScript
**Deliverable:** REST API + WebSocket server consumed by the Dashboard

---

## Member 2 — AI & NLP Engineer

### LLM Abstraction Layer
- Define the `LLMProvider` TypeScript interface with four methods: `classify`, `extractCommitments`, `draftReply`, `detectTone`
- Implement `AnthropicProvider` (Claude 3.5 Sonnet) as the default
- Implement `OpenAIProvider` (GPT-4o) as the first alternative
- Write a factory function: `getLLMProvider(env) → LLMProvider`
- Add retry logic with exponential backoff for API rate limits
- Log all LLM calls with token counts for cost monitoring

**Tech:** Anthropic SDK, OpenAI SDK, TypeScript interfaces
**Deliverable:** Swappable LLM layer; switching provider requires only ENV var change

### NLP Classification Engine
- Write classification prompt returning type (`unanswered_query` | `commitment_made` | `relationship_drift` | `neutral`) + confidence score
- Implement few-shot examples in the prompt for each classification type
- Parse and validate LLM JSON response; handle malformed outputs gracefully
- Add confidence threshold: events below 0.5 confidence logged as neutral
- Write unit tests against 20 labelled sample messages (5 per class)
- Instrument classification latency and accuracy metrics

**Tech:** Claude / GPT-4o, prompt engineering, Jest
**Deliverable:** ClassificationEngine with >80% accuracy on test set; <2s average latency

### Commitment Extraction
- Write extraction prompt: identify explicit promises — what, to whom, by when
- Return structured JSON: `{ action: string, target: string, deadline: ISO8601 | null }`
- Handle implicit commitments: "I'll get back to you" → deadline null, flag for follow-up
- Integrate with `ClassifiedEvent`: attach `commitment[]` array when `type = commitment_made`
- Write test cases: 10 messages with explicit commitments, 5 with implicit

**Tech:** Claude Sonnet, JSON prompt output, TypeScript types
**Deliverable:** Commitment extractor correctly parsing explicit and implicit promises

### Tone Detection
- Write tone detection prompt returning profile (`professional` | `casual` | `urgent` | `emotional`) + formality score (0.0–1.0)
- Store tone profile in SOUL.md under `tone_profile` field (updated per interaction)
- Expose tone profile to the reply drafting step as context
- Write 10 tone-detection test cases covering edge cases (sarcasm, multi-tone messages)

**Tech:** Claude API, prompt engineering
**Deliverable:** Tone detection feeding accurate profiles to reply drafting

### Reply Draft Generation
- Write reply drafting prompt: given original message, SOUL.md profile, and detected tone — draft a contextually appropriate reply
- Include relationship context from SOUL.md: relationship weight, past commitments, tone history
- Return: `{ draft: string, tone: ToneProfile, confidence: float, suggested_send_time: ISO8601 }`
- Implement a draft review step before any auto-send: write to Dashboard for user approval
- Add a dry-run mode for testing: log draft without sending
- Write 5 end-to-end draft generation tests covering each classification type

**Tech:** Claude 3.5 Sonnet, SOUL.md context injection, prompt chaining
**Deliverable:** Draft generator producing tone-matched, contextually appropriate replies

---

## Member 3 — Memory & Scheduler Systems

### SOUL.md Schema & Read Layer
- Define the `SOULProfile` TypeScript type: name, relationship_weight, last_contact, health_score, tone_profile, open_commitments[], interaction_log[]
- Implement `SoulStore` class with methods: `getProfile(contactId)`, `listContacts()`, `searchByName()`
- Parse SOUL.md Markdown files into `SOULProfile` objects using a custom parser
- Handle missing profiles: auto-create with defaults on first encounter
- Implement read caching with TTL to avoid re-parsing on every request
- Write unit tests for parse/serialise round-trip with 5 sample profiles

**Tech:** Node.js fs, TypeScript, custom Markdown parser
**Deliverable:** SoulStore with reliable read/parse; new profiles auto-created for unknown contacts

### SOUL.md Write Layer
- Implement `SoulStore.writeInteraction(contactId, interaction)`: appends to `interaction_log[]`
- Implement `SoulStore.updateCommitment(contactId, commitment, status)`: marks commitments as fulfilled or pending
- Implement `SoulStore.updateHealthScore(contactId)`: recalculates health score based on interaction frequency, open commitments, elapsed time
- Implement `SoulStore.updateToneProfile(contactId, toneProfile)`: merges new tone signal with historical profile (exponential moving average)
- Implement atomic file writes (write to temp then rename) to prevent corruption
- Write integration tests: create, update, and read back profiles end-to-end

**Tech:** Node.js fs/promises, atomic writes, TypeScript
**Deliverable:** Full SOUL.md write pipeline; profiles persist correctly after each interaction

### Priority Scoring Engine
- Implement `ScoringEngine.score(event: ClassifiedEvent, profile: SOULProfile): number`
- Formula: `urgency_weight(event.type) × profile.relationship_weight × Math.log2(elapsed_hours + 1)`
- Implement urgency weight constants per event type
- Implement `ActionQueue` class: insert, peekTop(n), remove, and size methods
- Implement deduplication in `ActionQueue`: same contact + same type within 2 hours = merge, not duplicate
- Write unit tests for scoring formula with 10 test cases covering edge values
- Write benchmark: queue must handle 1000 inserts in < 100ms

**Tech:** TypeScript, min-heap priority queue, Jest
**Deliverable:** Scoring engine producing correct ranked queue; handles duplicates cleanly

### HEARTBEAT Daemon
- Implement HEARTBEAT using `node-cron` (default: every 30 minutes)
- On each tick: read top-N `ActionItem`s from `ActionQueue` where `score > ACTION_THRESHOLD` (default: 0.6)
- Implement action dispatch: `{ NUDGE: notify user, DRAFT: call LLM layer, SILENT_LOG: write to SOUL.md only }`
- Implement idempotency: track `last_action_id` per contact; skip if same action fired < 2 hours ago
- Write HEARTBEAT config loader from `.env`: `HEARTBEAT_INTERVAL`, `ACTION_THRESHOLD`, `TOP_N`, `DRY_RUN`
- Implement graceful shutdown: finish current tick before stopping
- Write integration test: fire HEARTBEAT in dry-run mode, verify correct actions selected

**Tech:** node-cron, TypeScript, dotenv
**Deliverable:** HEARTBEAT daemon running autonomously; correct actions selected and dispatched

### Health Score & Drift Detection
- Implement health score algorithm: starts at 100, decays −5 pts/week without contact, +10 per interaction, −20 per broken commitment
- Implement drift detection: flag as `relationship_drift` if `health_score < 40` or `last_contact > 30 days`
- Expose health score in SOUL.md and in the API response
- Write 5 unit tests for health score transitions

**Tech:** TypeScript, SOUL.md write layer
**Deliverable:** Health scores accurately tracking relationship state; drift events generated correctly

---

## Member 4 — Frontend, QA & Demo Lead

### React Dashboard UI
- Scaffold React + Vite + TypeScript + TailwindCSS project
- Implement `DebtQueueView`: shows pending action items sorted by score, with score badge, channel icon, contact name, and message preview
- Implement `ContactProfileView`: renders a SOUL.md profile — relationship weight, health score, tone, commitment list, interaction timeline
- Implement `ActionLog`: chronological log of all HEARTBEAT actions taken
- Implement `DraftReviewModal`: shows a pending draft reply with approve / edit / dismiss actions
- Connect to WebSocket for live queue updates (no manual refresh needed)
- Responsive layout, readable typography

**Tech:** React 18, Vite, TailwindCSS, WebSocket
**Deliverable:** Working dashboard showing live debt queue, profiles, action log, and draft review

### API Integration
- Implement API client module: typed fetch wrappers for all backend endpoints
- `GET /api/queue` → DebtQueueView data
- `GET /api/contacts` → ContactList data
- `POST /api/action/:id/approve` → calls backend, updates queue state
- `POST /api/action/:id/dismiss` → calls backend, removes from queue
- Handle loading states, error states, and empty states in the UI
- Add WebSocket listener: on queue update event, refresh `DebtQueueView`

**Tech:** fetch API, WebSocket, React state
**Deliverable:** All API calls working; UI reflects live backend state

### End-to-End Testing
- Write 6 E2E test scenarios using Jest + Supertest:
  1. Simulate inbound WhatsApp message → verify `ClassifiedEvent` produced with correct type
  2. Simulate commitment message → verify commitment appears in SOUL.md
  3. Advance mock clock by 2 hours → fire HEARTBEAT → verify NUDGE generated for high-score item
  4. Send test message to Gmail → verify ingestion via Gmail adapter
  5. Trigger draft generation → verify `DraftReply` has correct structure and non-empty content
  6. Approve a draft → verify action status updated in queue and SOUL.md
- Document all test results in a QA report

**Tech:** Jest, Supertest, mock clock (sinon), TypeScript
**Deliverable:** 6 passing E2E tests; QA report with results and known issues

### Pitch Deck & Documentation
- Polish all 7 slides: verify all copy matches final implementation
- Add a live demo slide with screenshot of the running Dashboard
- Write `README.md`: setup instructions, environment variables, how to run each component, architecture diagram in ASCII
- Write API documentation: all endpoints, request/response shapes, error codes
- Prepare live demo script: 3-minute walkthrough of end-to-end debt detection → HEARTBEAT action → dashboard review
- Record a 2-minute backup demo video in case of live demo failure
- Prepare answers to likely judge questions about scalability, privacy, and OpenClaw fit

**Tech:** Markdown, screen recording, slides
**Deliverable:** Polished pitch deck, complete README, API docs, demo script, and backup video

---

## Complete Deliverables Register

| Owner | Deliverable | Due Phase | Acceptance Criteria |
|---|---|---|---|
| Member 1 | Gateway module + IChannelAdapter interface | Phase 1 | New MessageEvent emitted within 200ms; TypeScript compiles with no errors |
| Member 1 | WhatsApp adapter | Phase 2 | Test message from WhatsApp appears as MessageEvent in queue within 5s |
| Member 1 | Telegram adapter | Phase 2 | Test message from Telegram appears as MessageEvent; sendMessage sends correctly |
| Member 1 | Gmail adapter | Phase 2 | Unread Gmail message appears as MessageEvent with thread_id populated |
| Member 1 | REST API + WebSocket server | Phase 3 | All endpoints green; WebSocket update arrives within 1s of queue change |
| Member 2 | LLMProvider interface + Anthropic implementation | Phase 1 | `classify()` returns valid ClassificationResult for 10 test inputs |
| Member 2 | NLP classification engine | Phase 2 | Unit tests pass; latency <2s average; confidence scores calibrated |
| Member 2 | Commitment extraction | Phase 2 | Correctly extracts commitments from 15/15 test messages |
| Member 2 | Tone detection | Phase 3 | 10/10 tone test cases pass; profile written to SOUL.md correctly |
| Member 2 | Reply draft generation | Phase 3 | Draft generated for each action type; confidence > 0.7; stored for dashboard review |
| Member 3 | SOUL.md schema + SoulStore read | Phase 1 | Round-trip parse/serialise test passes; new profile auto-created for unknown contact |
| Member 3 | SOUL.md write layer | Phase 2 | Integration test: create → interact → read back → values correct; atomic writes verified |
| Member 3 | Priority scoring engine + ActionQueue | Phase 2 | 10 scoring unit tests pass; benchmark: 1000 inserts < 100ms; dedup works |
| Member 3 | HEARTBEAT daemon | Phase 3 | Dry-run test: correct top-N items selected; idempotency prevents double-fire within 2hr window |
| Member 3 | Health score & drift detection | Phase 3 | 5 unit tests pass; drift event generated at correct thresholds |
| Member 4 | React dashboard scaffold | Phase 1 | `npm run dev` serves working page; no TypeScript errors |
| Member 4 | DebtQueueView + ContactProfileView | Phase 2 | Both views render correctly with real data; score badges display correctly |
| Member 4 | API integration + WebSocket | Phase 3 | Queue updates in UI within 1s of backend change; approve/dismiss reflected immediately |
| Member 4 | DraftReviewModal | Phase 3 | Modal appears for each DRAFT action; approve calls backend; UI updates after action |
| Member 4 | 6 E2E test cases | Phase 3 | All 6 tests pass in CI; QA report written |
| Member 4 | README + API docs | Phase 4 | Fresh clone → `npm install` → `npm run dev` works following README alone |
| Member 4 | Pitch deck (polished) | Phase 4 | No placeholder text; screenshot matches live demo; all stats sourced |
| Member 4 | Demo script + backup video | Phase 4 | Script rehearsed by all members; backup video renders correctly |

---

## Sprint Phases

| Phase | Hours | Member 1 | Member 2 | Member 3 | Member 4 |
|---|---|---|---|---|---|
| **Phase 1 — Foundation** | 0–4 | Scaffold Gateway + IChannelAdapter; define MessageEvent; set up Express skeleton; configure .env | Define LLMProvider interface; set up Anthropic SDK; write `classify()` stub; create test dataset (20 samples) | Define SOULProfile type; implement `SoulStore.getProfile` + auto-create; write round-trip parse test | Scaffold React/Vite/Tailwind; basic routing; connect to mock API; confirm build works |
| **Phase 2 — Core Build** | 4–10 | All three channel adapters ingesting messages; dedup working; outbound send for WA + TG | Classification engine passing unit tests; commitment extraction working; integrate with Gateway events | Full SOUL.md write layer; priority scoring engine; ActionQueue with dedup; SoulStore integration tests green | DebtQueueView + ContactProfileView with real API data; API client module typed and tested; loading/error states |
| **Phase 3 — Integration** | 10–14 | REST API all endpoints live; WebSocket pushing live updates; integration with NLP + SOUL.md complete | Tone detection integrated with SOUL.md; reply drafting with SOUL.md context; OpenAI fallback provider working | HEARTBEAT daemon running in dry-run; health score algorithm; all actions dispatching correctly end-to-end | DraftReviewModal working; WebSocket live updates in UI; 6 E2E tests written and passing |
| **Phase 4 — Polish & Demo** | 14–16 | Final bug fixes on integrations; support Member 4 with demo data seeding | Final tuning of prompts for demo messages; support demo script preparation | HEARTBEAT configured for demo interval (5 min); seed SOUL.md profiles for demo contacts | Polish pitch deck; rehearse demo script with team; record backup video; publish README |