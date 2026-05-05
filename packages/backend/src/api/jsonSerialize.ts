/**
 * Stable JSON payloads for REST + WebSocket (dates → ISO strings).
 */

import { ActionItem, DraftReply, SOULProfile } from '../../../shared/types';

export function toJsonISO(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonISO);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toJsonISO(v);
    }
    return out;
  }
  return value;
}

export function serializeQueue(queue: ActionItem[]): unknown[] {
  return queue.map((a) => toJsonISO(a)) as unknown[];
}

export function serializeProfile(profile: SOULProfile): unknown {
  return toJsonISO(profile);
}

export function serializeDraft(draft: DraftReply): unknown {
  return toJsonISO(draft);
}
