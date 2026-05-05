import type {
  ActionItem,
  ClassifiedEvent,
  Commitment,
  DraftReply,
  ToneProfile,
} from '../../../shared/types';

const defaultTone: ToneProfile = {
  primary: 'professional',
  formality_score: 0.7,
  confidence: 0.9,
};

export function makeClassifiedEvent(
  overrides: Partial<ClassifiedEvent> & Pick<ClassifiedEvent, 'type' | 'content'>,
): ClassifiedEvent {
  const now = new Date();
  return {
    id: overrides.id ?? 'ev_test',
    channel: overrides.channel ?? 'whatsapp',
    sender: overrides.sender ?? { id: 'u1', name: 'Test User' },
    content: overrides.content,
    timestamp: overrides.timestamp ?? now,
    thread_id: overrides.thread_id,
    metadata: overrides.metadata,
    type: overrides.type,
    confidence: overrides.confidence ?? 0.9,
    commitments: overrides.commitments ?? [],
    tone_profile: overrides.tone_profile ?? defaultTone,
    entities: overrides.entities ?? {},
  };
}

export function makeActionItem(
  partial: Partial<ActionItem> & {
    id: string;
    contact_id: string;
    event: ClassifiedEvent;
  },
): ActionItem {
  return {
    score: partial.score ?? 0.5,
    action_type: partial.action_type ?? 'NUDGE',
    created_at: partial.created_at ?? new Date(),
    processed_at: partial.processed_at,
    ...partial,
  };
}

export function makePendingDraft(
  actionId: string,
  text = 'Thanks for your note — I will follow up shortly.',
): DraftReply {
  return {
    id: `draft_${actionId}`,
    action_id: actionId,
    original_message_id: 'msg_x',
    draft_text: text,
    tone: defaultTone,
    suggested_send_time: new Date(),
    confidence: 0.85,
    status: 'pending',
  };
}

export function sampleCommitment(): Commitment {
  return {
    action: 'Send meeting notes',
    target: 'team',
    deadline: null,
    confidence: 0.95,
  };
}
