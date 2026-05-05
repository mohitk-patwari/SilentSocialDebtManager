# Demo Script — Silent Social Debt Manager

## Goal

Demonstrate end-to-end flow from message ingestion to automated draft approval.

## Demo Steps (5–7 minutes)

1. **Show Dashboard (Queue Empty)**
   - Open frontend dashboard
   - Confirm no pending actions

2. **Send Test Message (Telegram)**
   - Send a message that contains a question
   - Confirm inbound message is ingested (backend logs)

3. **Classification + Scoring**
   - Show queue update in dashboard
   - Highlight priority score for the new action

4. **HEARTBEAT Trigger (Dry-Run)**
   - Wait for HEARTBEAT tick (or set to 5 min for demo)
   - Confirm `DRAFT` action is generated

5. **Review Draft**
   - Open draft modal
   - Approve the draft

6. **SOUL.md Update**
   - Show updated contact profile
   - Highlight interaction log and health score

7. **Wrap-Up**
   - Recap: ingestion → classification → scoring → action → memory update

## Demo Data

- Use one Telegram test contact
- Use 1–2 example messages only
- Pre-warm LLM calls to avoid latency
