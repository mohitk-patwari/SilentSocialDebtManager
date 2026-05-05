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
    // Call LLM to classify
    const classification = await this.llmProvider.classify(messageText);

    // Extract commitments if applicable
    let commitments: Commitment[] = [];
    if (classification.type === 'commitment_made') {
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
      type: classification.type,
      confidence: classification.confidence,
      commitments,
      tone_profile: tone,
      entities: {},
    };
  }
}
