import { ActionItem } from "../../../shared/types";

/**
 * ActionQueue - Priority Queue with Deduplication
 */
export class ActionQueue {
  private queue: ActionItem[] = [];
  private deduplicationMap: Map<string, ActionItem> = new Map();

  /**
   * Insert action with deduplication
   * Prevents same contact + same type within 2 hours
   */
  insert(action: ActionItem): void {
    const key = this.getDeduplicationKey(action);
    const existing = this.deduplicationMap.get(key);

    if (
      existing &&
      this.isWithin2Hours(existing.created_at, action.created_at)
    ) {
      console.log(`[ActionQueue] Duplicate skipped: ${key}`);
      return;
    }

    this.queue.push(action);

    // sort highest score first
    this.queue.sort((a, b) => b.score - a.score);

    this.deduplicationMap.set(key, action);
  }

  /**
   * Get top N actions
   */
  peekTop(n: number): ActionItem[] {
    return this.queue.slice(0, n);
  }

  /**
   * Remove action by ID
   */
  remove(actionId: string): void {
    const index = this.queue.findIndex((a) => a.id === actionId);

    if (index !== -1) {
      const removed = this.queue[index];

      // remove from queue
      this.queue.splice(index, 1);

      // remove from dedup map
      const key = this.getDeduplicationKey(removed);
      this.deduplicationMap.delete(key);
    }
  }

  /**
   * Get full queue (for debugging/demo)
   */
  getAll(): ActionItem[] {
    return this.queue;
  }

  /**
   * Queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Generate deduplication key
   */
  private getDeduplicationKey(action: ActionItem): string {
    return `${action.contact_id}_${action.action_type}`;
  }

  /**
   * Check if within 2-hour window
   */
  private isWithin2Hours(date1: Date, date2: Date): boolean {
    const twoHours = 2 * 60 * 60 * 1000;
    return Math.abs(date1.getTime() - date2.getTime()) < twoHours;
  }
}