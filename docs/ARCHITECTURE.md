# System Architecture — Silent Social Debt Manager

## Five-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD (React + WebSocket)                              │
│  - Debt Queue View | Contact Profile View | Action Log      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│  REST API + WebSocket Server (Express.js)                   │
│  /api/queue | /api/contacts | /api/action/* | /ws            │
└──────────────────────┬──────────────────────────────────────┘
                       │
    ┌──────────────────┼──────────────────┬─────────────────┐
    │                  │                  │                 │
┌───▼──────┐   ┌──────▼──────┐   ┌──────▼────────┐   ┌────▼──────┐
│ HEARTBEAT │   │   Scoring   │   │    SOUL.md    │   │   NLP     │
│ Scheduler │   │   Engine    │   │   Memory      │   │ Classification
│ (DAEMON)  │   │   (Queue)   │   │               │   │ Engine
└───┬──────┘   └──────┬──────┘   └───┬──────────┘   └────┬───────┘
    │                  │              │                   │
    └──────────────────┴──────────────┴───────────────────┘
                       │
                ┌──────▼─────────┐
                │ Message Queue  │
                │ (Deduplication)│
                └──────┬─────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───▼────────┐  ┌─────▼──────┐  ┌───────▼─────┐
│ WhatsApp   │  │  Telegram  │  │   Gmail     │
│ Adapter    │  │  Adapter   │  │   Adapter   │
│ (Webhooks) │  │ (Polling)  │  │  (OAuth)    │
└────────────┘  └────────────┘  └─────────────┘
```

## Data Flow Example

1. **Message Arrives**
   - WhatsApp webhook → Gateway.enqueueMessage()
   - Deduplication check by message ID

2. **Classification**
   - NLP Classification Engine calls LLM provider
   - Returns: type, confidence, commitments, tone

3. **Scoring**
   - Scoring Engine reads SOUL.md for contact
   - Calculates: urgency × relationship_weight × log₂(elapsed_hours + 1)
   - Inserts into ActionQueue (sorted by score)

4. **HEARTBEAT Tick** (every 30 min)
   - Reads top-N items where score > threshold
   - Checks idempotency (skip if same action < 2 hours ago)
   - Dispatches: NUDGE | DRAFT | SILENT_LOG

5. **Memory Write**
   - Interaction appended to SOUL.md
   - Health score recalculated
   - Tone profile updated (EMA)

6. **Dashboard Update**
   - Backend pushes via WebSocket
   - Frontend re-renders queue in real-time

## Module Responsibilities

| Module | Owns | Inputs | Outputs |
|---|---|---|---|
| **Gateway** | Message ingestion, dedup | Webhook/poll from channels | MessageEvent queue |
| **NLP Engine** | Classification, extraction | MessageEvent, LLM provider | ClassifiedEvent |
| **Scoring** | Priority queue, ranking | ClassifiedEvent, SOUL profile | ActionItem with score |
| **HEARTBEAT** | Action dispatch, scheduling | ActionQueue, config | Nudge/Draft/SilentLog |
| **SOUL Store** | Contact memory, persistence | Interactions, tone, health | SOUL.md files |
| **API Server** | REST/WebSocket, dashboard | HTTP requests | JSON responses |

## Key Design Decisions

### Deduplication
- Message ID uniqueness enforced in Gateway
- Action deduplication: same contact + type within 2 hours

### Scoring Formula
```
Score = urgency_weight(type) × relationship_weight × log₂(elapsed_hours + 1)
```
- Commitment: 1.5 (highest urgency)
- Query: 1.2 (direct question)
- Drift: 0.8 (passive signal)
- Neutral: 0.3 (rarely acted on)

### Health Score Algorithm
- Starts at 100
- Decays −5/week without contact
- +10 per interaction
- −20 per broken commitment
- Drift triggered: score < 40 OR last_contact > 30 days

### Tone History
- Stored as list in SOUL.md
- Updated via exponential moving average (EMA)
- Influences reply drafting

### Atomic Writes
- SOUL.md written to `.tmp` then renamed
- Prevents corruption under concurrent writes
