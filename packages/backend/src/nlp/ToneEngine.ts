// ============================================================================
// FILE: packages/backend/src/nlp/ToneEngine.ts
// PURPOSE: Wrapper for tone detection with fallback safety
// ============================================================================

import { LLMProvider, ToneProfile } from '../../../shared/types';

export class ToneEngine {
  constructor(private llm: LLMProvider) {}

  async detect(message: string): Promise<ToneProfile> {
    try {
      return await this.llm.detectTone(message);
    } catch {
      return {
        primary: 'casual',
        formality_score: 0.5,
        confidence: 0,
      };
    }
  }
}