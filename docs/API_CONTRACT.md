# API Contract — Silent Social Debt Manager

## REST API Endpoints

### Queue Management

**GET /api/queue**
- Returns current priority queue
- Query params: `?top_n=5` (default 5)
- Response:
  ```json
  {
    "success": true,
    "data": {
      "queue": [ActionItem],
      "total": 42,
      "top_n": 5
    },
    "timestamp": "2024-01-15T14:30:00Z"
  }
  ```

### Contacts

**GET /api/contacts**
- Returns list of SOUL.md profiles
- Query params: `?limit=10&offset=0`
- Response:
  ```json
  {
    "success": true,
    "data": {
      "contacts": [SOULProfile],
      "total": 25
    },
    "timestamp": "2024-01-15T14:30:00Z"
  }
  ```

**GET /api/contacts/:id**
- Get a single contact's full SOUL profile (same shape as list items)
- Response:
  ```json
  {
    "success": true,
    "data": { "SOULProfile": "..." },
    "timestamp": "2024-01-15T14:30:00Z"
  }
  ```
- Error: `404` with `{ "success": false, "error": "Contact not found", ... }`

### Actions

**POST /api/action/:id/approve**
- Approve a draft reply
- Body: `{ "edits"?: string }`
- Response: `{ "success": true, "draft_id": "..." }`

**POST /api/action/:id/dismiss**
- Dismiss a pending action
- Body: `{ "reason"?: string }`
- Response: `{ "success": true }`

## WebSocket Events

**Connection**: `ws://localhost:3000/ws`

### Server → Client

```json
{
  "type": "queue_update",
  "data": { "queue": [ActionItem] }
}
```

```json
{
  "type": "draft_ready",
  "data": { "draft": DraftReply }
}
```

### Client → Server

```json
{
  "type": "subscribe_to_contact",
  "contact_id": "alice_smith"
}
```

## Error Handling

All errors return 4xx/5xx with:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

Common errors:
- `400` — Bad request (invalid params)
- `401` — Unauthorized (missing auth)
- `404` — Not found (contact not found)
- `500` — Internal server error
