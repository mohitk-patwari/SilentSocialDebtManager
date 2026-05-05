import type {
  ActionItem,
  ClassifiedEvent,
  Commitment,
  DraftReply,
  InteractionRecord,
  SOULProfile,
  ToneProfile,
} from '@ssdm/shared'

function parseIso(d: unknown): Date {
  if (d instanceof Date) return d
  if (typeof d === 'string') return new Date(d)
  return new Date(NaN)
}

function parseCommitment(c: Record<string, unknown>): Commitment {
  return {
    action: String(c.action ?? ''),
    target: String(c.target ?? ''),
    deadline:
      c.deadline === null || c.deadline === undefined ? null : parseIso(c.deadline),
    confidence: Number(c.confidence ?? 0),
  }
}

function parseToneProfile(t: Record<string, unknown>): ToneProfile {
  return {
    primary: t.primary as ToneProfile['primary'],
    secondary: t.secondary as ToneProfile['secondary'] | undefined,
    formality_score: Number(t.formality_score ?? 0),
    confidence: Number(t.confidence ?? 0),
  }
}

export function parseClassifiedEvent(ev: Record<string, unknown>): ClassifiedEvent {
  const sender = (ev.sender ?? {}) as Record<string, unknown>
  const commitmentsRaw = Array.isArray(ev.commitments) ? ev.commitments : []
  return {
    id: String(ev.id ?? ''),
    channel: ev.channel as ClassifiedEvent['channel'],
    sender: {
      id: String(sender.id ?? ''),
      name: String(sender.name ?? ''),
      email: sender.email !== undefined ? String(sender.email) : undefined,
    },
    content: String(ev.content ?? ''),
    timestamp: parseIso(ev.timestamp),
    thread_id:
      ev.thread_id !== undefined ? String(ev.thread_id) : undefined,
    metadata: ev.metadata !== undefined ? (ev.metadata as Record<string, unknown>) : undefined,
    type: ev.type as ClassifiedEvent['type'],
    confidence: Number(ev.confidence ?? 0),
    commitments: commitmentsRaw.map((c) =>
      parseCommitment(c as Record<string, unknown>),
    ),
    tone_profile: parseToneProfile((ev.tone_profile ?? {}) as Record<string, unknown>),
    entities: (ev.entities ?? {}) as Record<string, unknown>,
  }
}

export function parseActionItem(raw: unknown): ActionItem {
  const a = raw as Record<string, unknown>
  const ev = (a.event ?? {}) as Record<string, unknown>
  return {
    id: String(a.id ?? ''),
    contact_id: String(a.contact_id ?? ''),
    score: Number(a.score ?? 0),
    action_type: a.action_type as ActionItem['action_type'],
    created_at: parseIso(a.created_at),
    processed_at:
      a.processed_at !== undefined && a.processed_at !== null
        ? parseIso(a.processed_at)
        : undefined,
    event: parseClassifiedEvent(ev),
  }
}

export function parseSOULProfile(raw: unknown): SOULProfile {
  const p = raw as Record<string, unknown>
  const oc = Array.isArray(p.open_commitments) ? p.open_commitments : []
  const il = Array.isArray(p.interaction_log) ? p.interaction_log : []
  const th = Array.isArray(p.tone_profile_history)
    ? p.tone_profile_history
    : []
  return {
    contact_id: String(p.contact_id ?? ''),
    name: String(p.name ?? ''),
    relationship_weight: Number(p.relationship_weight ?? 0),
    last_contact: parseIso(p.last_contact),
    health_score: Number(p.health_score ?? 0),
    tone_profile_history: th.map((t) =>
      parseToneProfile(t as Record<string, unknown>),
    ),
    open_commitments: oc.map((c) =>
      parseCommitment(c as Record<string, unknown>),
    ),
    interaction_log: il.map((r) =>
      parseInteractionRecord(r as Record<string, unknown>),
    ),
  }
}

function parseInteractionRecord(
  r: Record<string, unknown>,
): InteractionRecord {
  return {
    timestamp: parseIso(r.timestamp),
    type: r.type as InteractionRecord['type'],
    score: Number(r.score ?? 0),
    action_taken: r.action_taken as InteractionRecord['action_taken'] | undefined,
    draft_id: r.draft_id !== undefined ? String(r.draft_id) : undefined,
  }
}

export function parseDraftReply(raw: unknown): DraftReply {
  const d = raw as Record<string, unknown>
  return {
    id: String(d.id ?? ''),
    action_id: String(d.action_id ?? ''),
    original_message_id: String(d.original_message_id ?? ''),
    draft_text: String(d.draft_text ?? ''),
    tone: parseToneProfile((d.tone ?? {}) as Record<string, unknown>),
    suggested_send_time:
      d.suggested_send_time !== undefined && d.suggested_send_time !== null
        ? parseIso(d.suggested_send_time)
        : undefined,
    confidence: Number(d.confidence ?? 0),
    status: d.status as DraftReply['status'],
  }
}
