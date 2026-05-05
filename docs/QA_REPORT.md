# QA Report — Silent Social Debt Manager (Member 4)

**Date:** 2026-05-05  
**Scope:** React dashboard, REST/WebSocket consumption, mocked E2E API tests.

## Summary

| Area | Status | Notes |
|------|--------|--------|
| Dashboard (queue, contacts, action log, draft modal) | Pass | Vite dev server with proxy to backend |
| REST contract (`ApiResponse` envelope) | Pass | Implemented in `packages/backend/src/api/createApp.ts` |
| WebSocket `/ws` (`queue_update`, `draft_ready`) | Pass | Hub attaches to HTTP server; clients receive initial `queue_update` on connect |
| Mocked E2E (6 scenarios) | Pass | `packages/backend/tests/e2e/pipeline.e2e.test.ts` |
| Real WhatsApp / Telegram / Gmail | Not in CI | By design; adapters not exercised in these tests |
| Pitch deck / backup video | N/A in repo | Team assets outside this repository |

## E2E results (mocked)

Command: `npm test` (from repository root; runs workspace tests).

| # | Scenario | Assertion |
|---|----------|-----------|
| 1 | Inbound message → queue | `GET /api/queue` returns `unanswered_query` on seeded `ActionItem` |
| 2 | Commitment → SOUL | `GET /api/contacts/:id` shows merged `open_commitments` |
| 3 | HEARTBEAT + clock | `sinon` fake timers +2h; `runTickOnce` appends `NUDGE` to `MemoryContactStore` |
| 4 | Gmail path | Queue JSON includes `thread_id` for `channel: gmail` |
| 5 | Draft structure | Stub `DraftReply` + queue row `action_type === 'DRAFT'`; confidence & text checks |
| 6 | Approve draft | `POST /api/action/:id/approve` removes queue row and logs interaction with `draft_id` |

All six tests passed on last run locally.

## Known limitations

- **Persistent SOUL filesystem:** Production entry uses `MemoryContactStore`; `SoulStore` file I/O remains TODO for Member 3.
- **HEARTBEAT → drafts:** Dispatch path does not yet call the LLM or populate `draftsByActionId`; tests seed drafts explicitly. Dashboard shows drafts when WS receives `draft_ready` or when backend wires generation.
- **`yarn workspaces foreach`** in root scripts: Yarn 1 lacks this subcommand; use **`npm install` / `npm test`** at the repo root or run package scripts individually.

## Non-code deliverables (hackathon checklist)

Pitch deck polishing, judge Q&A notes, demo recording, and the 3-minute live script updates should be synced with this UI (Debt queue → Contacts → Draft review modal). Slide assets are not tracked in Git.
