// ============================================================================
// FILE: packages/backend/src/nlp/MockProvider.ts
// PURPOSE: Temporary mock LLM provider to unblock development (Member 2)
// ============================================================================

import {
  LLMProvider,
  ClassificationResult,
  Commitment,
  ToneProfile,
  DraftReply,
  ReplyContext,
} from '../../../shared/types';

export class MockProvider implements LLMProvider {
  async classify(message: string): Promise<ClassificationResult> {
    if (message.includes('?')) {
      return { type: 'unanswered_query', confidence: 0.9 };
    }
    if (message.toLowerCase().includes("i'll") || message.toLowerCase().includes('will')) {
      return { type: 'commitment_made', confidence: 0.9 };
    }
    if (message.toLowerCase().includes('long time')) {
      return { type: 'relationship_drift', confidence: 0.8 };
    }
    return { type: 'neutral', confidence: 0.7 };
  }

  async extractCommitments(message: string): Promise<Commitment[]> {
    // Basic placeholder logic — will be replaced with real LLM extraction
    if (message.toLowerCase().includes("i'll")) {
      return [
        {
          action: 'Follow up',
          target: 'User',
          deadline: null,
          confidence: 0.7,
        },
      ];
    }
    return [];
  }

  async detectTone(message: string): Promise<ToneProfile> {
    // Simple heuristic tone detection
    if (message.includes('!')) {
      return { primary: 'urgent', formality_score: 0.5, confidence: 0.7 };
    }
    return { primary: 'casual', formality_score: 0.6, confidence: 0.8 };
  }

  async draftReply(context: ReplyContext): Promise<DraftReply> {
    return {
      id: 'mock-draft-id',
      action_id: 'mock-action-id',
      original_message_id: 'mock-msg-id',
      draft_text: `Got your message: "${context.original_message}". Will get back to you shortly.`,
      tone: context.detected_tone,
      confidence: 0.8,
      status: 'pending',
      suggested_send_time: new Date(),
    };
  }
}