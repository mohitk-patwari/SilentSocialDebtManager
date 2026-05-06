import { ClassifiedEvent, SOULProfile } from "../../../shared/types";

/**
 * Scoring Engine - Priority Queue Management
 */
export class ScoringEngine {
  /**
   * Score an event
   * Formula: urgency × relationship × log2(hours + 1)
   */
  score(event: ClassifiedEvent, profile: SOULProfile): number {
    const urgencyWeights: Record<string, number> = {
      commitment_made: 1.5,
      unanswered_query: 1.2,
      relationship_drift: 0.8,
      neutral: 0.3,
    };

    const urgency = urgencyWeights[event.type] || 0.3;
    const relationship = profile.relationship_weight;

    const elapsedHours = this.calculateElapsedHours(profile.last_contact);

    const safeHours = Math.max(1, elapsedHours);

    let score = urgency * relationship * Math.log2(safeHours + 1);

    if (profile.open_commitments.length > 0) {
      score += 0.3;
    }

    if (profile.health_score < 40) {
      score += 0.5;
    }

    return score;
  }

  private calculateElapsedHours(lastContact: Date | string): number {
    const now = new Date();

    const contactDate =
      typeof lastContact === "string"
        ? new Date(lastContact)
        : lastContact;

    return (now.getTime() - contactDate.getTime()) / (1000 * 60 * 60);
  }
}