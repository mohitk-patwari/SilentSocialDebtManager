/**
 * Shared Types & Interfaces — Silent Social Debt Manager
 * Lock these by end of Phase 1 (Hour 4)
 */

// ============================================================================
// MESSAGE EVENT
// ============================================================================

export interface MessageEvent {
  id: string; // Unique message ID (for deduplication)
  channel: 'whatsapp' | 'telegram' | 'gmail';
  sender: {
    id: string;
    name: string;
    email?: string;
  };
  content: string;
  timestamp: Date;
  thread_id?: string; // For Gmail threads
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CLASSIFIED EVENT
// ============================================================================

export type ClassificationType =
  | 'unanswered_query'
  | 'commitment_made'
  | 'relationship_drift'
  | 'neutral';

export interface Commitment {
  action: string;
  target: string;
  deadline: Date | null;
  confidence: number;
}

export interface ClassifiedEvent extends MessageEvent {
  type: ClassificationType;
  confidence: number;
  commitments: Commitment[];
  tone_profile: ToneProfile;
  entities: Record<string, unknown>;
}

// ============================================================================
// TONE PROFILE
// ============================================================================

export type ToneType = 'professional' | 'casual' | 'urgent' | 'emotional';

export interface ToneProfile {
  primary: ToneType;
  secondary?: ToneType;
  formality_score: number; // 0.0–1.0
  confidence: number;
}

// ============================================================================
// SOUL PROFILE (Contact Memory)
// ============================================================================

export interface SOULProfile {
  contact_id: string;
  name: string;
  relationship_weight: number; // 0.0–1.0
  last_contact: Date;
  health_score: number; // 0–100
  drift_detected?: boolean;
  broken_commitments_count?: number;
  last_action_meta?: {
    action_key: string;
    fired_at: Date;
  };
  tone_profile_history: ToneProfile[];
  open_commitments: Commitment[];
  interaction_log: InteractionRecord[];
}

export interface InteractionRecord {
  timestamp: Date;
  type: ClassificationType;
  score: number;
  action_taken?: 'NUDGE' | 'DRAFT' | 'SILENT_LOG';
  draft_id?: string;
}

// ============================================================================
// ACTION ITEM (Priority Queue)
// ============================================================================

export interface ActionItem {
  id: string;
  event: ClassifiedEvent;
  contact_id: string;
  score: number;
  action_type: 'NUDGE' | 'DRAFT' | 'SILENT_LOG';
  created_at: Date;
  processed_at?: Date;
}

// ============================================================================
// DRAFT REPLY
// ============================================================================

export interface DraftReply {
  id: string;
  action_id: string;
  original_message_id: string;
  draft_text: string;
  tone: ToneProfile;
  suggested_send_time?: Date;
  confidence: number;
  status: 'pending' | 'approved' | 'dismissed' | 'sent';
}

// ============================================================================
// LLM PROVIDER INTERFACE
// ============================================================================

export interface ClassificationResult {
  type: ClassificationType;
  confidence: number;
}

export interface ReplyContext {
  original_message: string;
  soul_profile: SOULProfile;
  detected_tone: ToneProfile;
}

export interface LLMProvider {
  classify(message: string): Promise<ClassificationResult>;
  extractCommitments(message: string): Promise<Commitment[]>;
  draftReply(context: ReplyContext): Promise<DraftReply>;
  detectTone(message: string): Promise<ToneProfile>;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface QueueResponse {
  queue: ActionItem[];
  total: number;
  top_n: number;
}

export interface ContactsResponse {
  contacts: SOULProfile[];
  total: number;
}
