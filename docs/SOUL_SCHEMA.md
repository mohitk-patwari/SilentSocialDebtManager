# SOUL.md Schema — Silent Social Debt Manager

## File Format

Each contact is stored as a single Markdown file at `souls/{contact_id}.md`

### Example File

```markdown
# Alice Smith — SOUL.md

**Contact ID:** alice_smith  
**Channel:** WhatsApp, Gmail  
**Created:** 2024-01-10T10:00:00Z  

## Relationship Profile

| Field | Value |
|-------|-------|
| Relationship Weight | 0.85 |
| Last Contact | 2024-01-15T14:30:00Z |
| Health Score | 72 / 100 |
| Primary Tone | professional |
| Formality Score | 0.75 |

## Open Commitments

- [ ] Send project notes (Deadline: 2024-01-20) — Detected 2024-01-14 | Status: Pending
- [ ] Call to discuss Q1 plan (Deadline: unknown) — Detected 2024-01-13 | Status: Pending

## Tone History

| Timestamp | Tone | Formality | Confidence |
|-----------|------|-----------|------------|
| 2024-01-15 | professional | 0.75 | 0.89 |
| 2024-01-10 | professional | 0.70 | 0.92 |
| 2024-01-08 | casual | 0.45 | 0.78 |

## Interaction Log

| Timestamp | Type | Score | Message Preview | Action Taken | Draft ID |
|-----------|------|-------|-----------------|--------------|----------|
| 2024-01-15 | unanswered_query | 0.78 | "When can you..." | DRAFT | draft_abc123 |
| 2024-01-13 | commitment_made | 0.92 | "I'll send notes..." | SILENT_LOG | — |
| 2024-01-10 | neutral | 0.25 | "Thanks!" | — | — |

## Health Score Calculation

```
health_score = 100 (base)
              - 5 * weeks_without_contact
              + 10 * interaction_count (last 30d)
              - 20 * broken_commitments
              = 72
```

**Drift Detection:** Score < 40 OR last_contact > 30 days

---

## Schema Definition (TypeScript)

```typescript
interface SOULProfile {
  contact_id: string;
  name: string;
  channels: string[]; // ['whatsapp', 'gmail', etc.]
  created_at: Date;
  
  relationship_weight: number; // 0.0–1.0
  last_contact: Date;
  health_score: number; // 0–100
  
  tone_profile: {
    primary: ToneType;
    secondary?: ToneType;
    formality_score: number; // 0.0–1.0
  };
  
  open_commitments: Commitment[];
  tone_history: ToneEntry[];
  interaction_log: InteractionRecord[];
}

interface Commitment {
  id: string;
  action: string;
  deadline?: Date;
  detected_at: Date;
  status: 'pending' | 'fulfilled' | 'abandoned';
}

interface ToneEntry {
  timestamp: Date;
  tone: ToneType;
  formality_score: number;
  confidence: number;
}

interface InteractionRecord {
  timestamp: Date;
  type: ClassificationType;
  score: number;
  message_preview: string;
  action_taken?: 'NUDGE' | 'DRAFT' | 'SILENT_LOG';
  draft_id?: string;
}
```

## Read/Write Operations

### Read
1. Parse Markdown file for contact
2. Extract frontmatter as JSON
3. Parse tables into arrays
4. Cache for 5 minutes (TTL)

### Write
1. Read current profile
2. Update fields (commitments, tone, interaction log)
3. Write to temporary file (`.tmp`)
4. Atomic rename (`.tmp` → final)

### Auto-Create
- First message from unknown contact → create SOUL.md with defaults
- Relationship weight starts at 0.5
- Health score starts at 100
- Empty commitment and tone history lists
