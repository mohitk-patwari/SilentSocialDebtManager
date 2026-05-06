// ============================================================================
// FILE: packages/backend/src/nlp/CommitmentEngine.ts
// PURPOSE: Wrapper around LLM commitment extraction with validation
// ============================================================================

import { LLMProvider, Commitment } from '../../../shared/types';

export class CommitmentEngine {
  constructor(private llm: LLMProvider) {}

  async extract(message: string): Promise<Commitment[]> {
    try {
      const commitments = await this.llm.extractCommitments(message);

      // Basic validation + normalization
      return commitments.map((c) => ({
        action: c.action || 'unknown',
        target: c.target || 'unknown',
        deadline: c.deadline ? new Date(c.deadline) : null,
        confidence: c.confidence ?? 0.5,
      }));
    } catch {
      return [];
    }
  }
}