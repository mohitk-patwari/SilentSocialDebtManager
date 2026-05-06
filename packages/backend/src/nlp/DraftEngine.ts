// ============================================================================
// FILE: packages/backend/src/nlp/DraftEngine.ts
// PURPOSE: Generates draft replies using LLM with safe fallback
// ============================================================================

import { LLMProvider, DraftReply, ReplyContext } from '../../../shared/types';

export class DraftEngine {
  constructor(private llm: LLMProvider) {}

  async generate(context: ReplyContext): Promise<DraftReply> {
    try {
      return await this.llm.draftReply(context);
    } catch {
      return {
        id: `draft_${Date.now()}`,
        action_id: '',
        original_message_id: '',
        draft_text: 'Will respond soon.',
        tone: context.detected_tone,
        confidence: 0,
        status: 'pending',
      };
    }
  }
}