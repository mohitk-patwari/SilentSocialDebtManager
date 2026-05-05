/**
 * HEARTBEAT Scheduler - Autonomous Daemon
 * Runs every 30 minutes (configurable) to dispatch actions
 */

import cron from 'node-cron';
import { ActionQueue } from './ActionQueue';
import { SoulStore } from '../memory/SoulStore';
import { ActionItem } from '../../../shared/types';

export class HEARTBEAT {
  private task: cron.ScheduledTask | null = null;
  private lastActionMap: Map<string, { id: string; time: number }> = new Map();

  constructor(
    private actionQueue: ActionQueue,
    private soulStore: SoulStore,
    private interval: number = 1800000, // 30 minutes
    private actionThreshold: number = 0.6,
    private topN: number = 5,
    private dryRun: boolean = false
  ) {}

  /**
   * Start the HEARTBEAT daemon
   */
  start(): void {
    const cronExpression = this.getCronExpression();
    console.log(`[HEARTBEAT] Starting with interval (cron: ${cronExpression})`);

    this.task = cron.schedule(cronExpression, async () => {
      try {
        await this.tick();
      } catch (error) {
        console.error('[HEARTBEAT] Error during tick:', error);
      }
    });
  }

  /**
   * Stop the HEARTBEAT daemon
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[HEARTBEAT] Stopped');
    }
  }

  /**
   * Execute a single HEARTBEAT tick
   */
  private async tick(): Promise<void> {
    console.log(`[HEARTBEAT] Tick started at ${new Date().toLocaleTimeString()}`);

    const topItems = this.actionQueue.peekTop(this.topN);
    const itemsToProcess = topItems.filter((item) => item.score >= this.actionThreshold);

    for (const item of itemsToProcess) {
      // Check idempotency: skip if same action fired < 2 hours ago
      if (this.isIdempotent(item)) {
        console.log(`[HEARTBEAT] Skipping duplicate action: ${item.id}`);
        continue;
      }

      await this.dispatchAction(item);
      this.lastActionMap.set(item.contact_id, {
  id: item.id,
  time: Date.now(),
});
this.actionQueue.remove(item.id);
    }

    console.log(`[HEARTBEAT] Tick complete (processed ${itemsToProcess.length} actions)`);
  }

  /**
   * Dispatch an action (NUDGE, DRAFT, or SILENT_LOG)
   */
  private async dispatchAction(item: ActionItem): Promise<void> {
    console.log(`[HEARTBEAT] Dispatching ${item.action_type} for contact ${item.contact_id}`);

    if (this.dryRun) {
      console.log(`[HEARTBEAT DRY_RUN] Would dispatch: ${item.action_type}`);
      return;
    }

    switch (item.action_type) {
      case 'NUDGE':
        await this.dispatchNudge(item);
        break;
      case 'DRAFT':
        await this.dispatchDraft(item);
        break;
      case 'SILENT_LOG':
        await this.dispatchSilentLog(item);
        break;
    }
  }

  private async dispatchNudge(item: ActionItem): Promise<void> {
    // TODO: Send notification to user
    console.log(`[HEARTBEAT] NUDGE: ${item.contact_id}`);
  }

  private async dispatchDraft(item: ActionItem): Promise<void> {
    // TODO: Generate and queue draft reply
    console.log(`[HEARTBEAT] DRAFT: ${item.contact_id}`);
  }

  private async dispatchSilentLog(item: ActionItem): Promise<void> {
    // TODO: Update SOUL.md without user notification
    console.log(`[HEARTBEAT] SILENT_LOG: ${item.contact_id}`);
  }

  /**
   * Check if action is idempotent (not fired in last 2 hours)
   */
  private isIdempotent(item: ActionItem): boolean {
  const record = this.lastActionMap.get(item.contact_id);
  if (!record) return false;

  const twoHours = 2 * 60 * 60 * 1000;

  return (
    record.id === item.id &&
    Date.now() - record.time < twoHours
  );
}

  /**
   * Convert interval in ms to cron expression
   */
  private getCronExpression(): string {
    // For demo: every 5 minutes; for production: every 30 minutes
    return '*/5 * * * * *'; // Every 5 minutes
  }
}
