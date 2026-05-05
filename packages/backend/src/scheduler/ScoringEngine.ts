/**
 * Scoring Engine - Priority Queue Management
 */

import { ClassifiedEvent, SOULProfile, ActionItem } from '../../../shared/types';

export class ScoringEngine {
  /**
   * Score an event based on urgency, relationship weight, and time decay
   * Formula: urgency_weight(type) × relationship_weight × log₂(elapsed_hours + 1)
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

    return urgency * relationship * Math.log2(elapsedHours + 1);
  }

  private calculateElapsedHours(lastContact: Date): number {
    const now = new Date();
    return (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);
  }
}

export class ActionQueue {
  private queue: ActionItem[] = [];
  private deduplicationMap: Map<string, ActionItem> = new Map();

  /**
   * Insert an action with deduplication (same contact + same type within 2 hours)
   */
  insert(action: ActionItem): void {
    const key = this.getDeduplicationKey(action);
    const existing = this.deduplicationMap.get(key);

    if (existing && this.isWithin2Hours(existing.created_at, action.created_at)) {
      console.log(`[ActionQueue] Duplicate action skipped: ${key}`);
      return;
    }

    this.queue.push(action);
    this.queue.sort((a, b) => b.score - a.score);
    this.deduplicationMap.set(key, action);
  }

  /**
   * Peek at top N actions
   */
  peekTop(n: number): ActionItem[] {
    return this.queue.slice(0, n);
  }

  /**
   * Remove an action
   */
  remove(actionId: string): void {
    const index = this.queue.findIndex((a) => a.id === actionId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }

  private getDeduplicationKey(action: ActionItem): string {
    return `${action.contact_id}_${action.action_type}`;
  }

  private isWithin2Hours(date1: Date, date2: Date): boolean {
    const twoHours = 2 * 60 * 60 * 1000;
    return Math.abs(date1.getTime() - date2.getTime()) < twoHours;
  }
}
