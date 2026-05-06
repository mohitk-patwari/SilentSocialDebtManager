/**
 * NLP Classification Engine
 * Classifies messages and extracts key entities
 */

import {
  LLMProvider,
  ClassifiedEvent,
  ClassificationType,
  Commitment,
  ToneProfile,
} from '../../../shared/types';

export class ClassificationEngine {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Classify a message and extract commitments
   */
  async classify(messageText: string): Promise<ClassifiedEvent> {
    try {
      // Call LLM to classify
      const classification = await this.llmProvider.classify(messageText);

      // ------------------------------------------------------------------
      // ✅ ADDED: Confidence threshold handling (prevents low-quality outputs)
      // ------------------------------------------------------------------
      const finalType: ClassificationType =
        classification.confidence < 0.5 ? 'neutral' : classification.type;

      // Extract commitments if applicable
      let commitments: Commitment[] = [];

      // ------------------------------------------------------------------
      // ✅ UPDATED: Always safe-call extraction but restrict heavy logic
      // ------------------------------------------------------------------
      if (finalType === 'commitment_made') {
        commitments = await this.llmProvider.extractCommitments(messageText);
      }

      // Detect tone
      const tone = await this.llmProvider.detectTone(messageText);

      return {
        id: `msg_${Date.now()}`,
        channel: 'whatsapp', // Placeholder
        sender: { id: '', name: '' },
        content: messageText,
        timestamp: new Date(),

        // ------------------------------------------------------------------
        // ✅ UPDATED: Use finalType instead of raw classification.type
        // ------------------------------------------------------------------
        type: finalType,
        confidence: classification.confidence,

        commitments,
        tone_profile: tone,

        // ------------------------------------------------------------------
        // ✅ ADDED: Placeholder for future entity extraction
        // ------------------------------------------------------------------
        entities: {},
      };
    } catch (error) {
      // ------------------------------------------------------------------
      // ✅ ADDED: Fail-safe fallback (prevents pipeline crash)
      // ------------------------------------------------------------------
      return {
        id: `msg_${Date.now()}`,
        channel: 'whatsapp',
        sender: { id: '', name: '' },
        content: messageText,
        timestamp: new Date(),
        type: 'neutral',
        confidence: 0,
        commitments: [],
        tone_profile: {
          primary: 'casual',
          formality_score: 0.5,
          confidence: 0,
        },
        entities: {},
      };
    }
  }
}