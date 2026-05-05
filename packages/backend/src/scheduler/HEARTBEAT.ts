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
  private inProgress = false;
  private stopRequested = false;

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
      if (this.inProgress) {
        console.log('[HEARTBEAT] Previous tick still running, skipping overlap');
        return;
      }

      this.inProgress = true;
      try {
        await this.tick();
      } catch (error) {
        console.error('[HEARTBEAT] Error during tick:', error);
      } finally {
        this.inProgress = false;
        if (this.stopRequested) {
          this.task?.stop();
          console.log('[HEARTBEAT] Stopped after current tick');
        }
      }
    });
  }

  /**
   * Stop the HEARTBEAT daemon
   */
  stop(): void {
    if (this.task) {
      if (this.inProgress) {
        this.stopRequested = true;
        console.log('[HEARTBEAT] Stop requested; waiting for current tick');
      } else {
        this.task.stop();
        console.log('[HEARTBEAT] Stopped');
      }
    }
  }

  /**
   * Execute a single HEARTBEAT tick
   */
  private async tick(): Promise<void> {
    console.log(`[HEARTBEAT] Tick started at ${new Date().toLocaleTimeString()}`);

    const topItems = this.actionQueue.peekTop(this.topN);
    const itemsToProcess = topItems.filter((item) => item.score >= this.actionThreshold);
    let processed = 0;
    for (const item of itemsToProcess) {
      const actionType = this.decideActionType(item);
      const actionKey = this.getActionKey(item, actionType);

      // Check idempotency: skip if same action fired < 2 hours ago
      if (await this.soulStore.isActionIdempotent(item.contact_id, actionKey)) {
        console.log(`[HEARTBEAT] Skipping duplicate action: ${item.id}`);
        this.actionQueue.remove(item.id);
        continue;
      }

      const actionTaken = await this.dispatchAction(item, actionType);
      await this.soulStore.writeInteraction(item.contact_id, {
        timestamp: new Date(),
        type: item.event.type,
        score: item.score,
        action_taken: actionTaken,
      });
      await this.soulStore.updateHealthScore(item.contact_id, {
        interactionBoost: true,
      });
      if (item.event.tone_profile) {
        await this.soulStore.updateToneProfile(item.contact_id, item.event.tone_profile);
      }
      await this.soulStore.markActionFired(item.contact_id, actionKey);
      this.actionQueue.remove(item.id);
      processed++;
    }
    console.log(`[HEARTBEAT] Tick complete (processed ${processed} actions)`);
  }

  /**
   * Dispatch an action (NUDGE, DRAFT, or SILENT_LOG)
   */
  private async dispatchAction(
    item: ActionItem,
    actionType: ActionItem['action_type']
  ): Promise<ActionItem['action_type']> {
    console.log(`[HEARTBEAT] Dispatching ${actionType} for contact ${item.contact_id}`);

    if (this.dryRun) {
      console.log(`[HEARTBEAT DRY_RUN] Would dispatch: ${actionType}`);
      return actionType;
    }

    switch (actionType) {
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
    return actionType;
  }

  private async dispatchNudge(item: ActionItem): Promise<void> {
    // TODO: Send notification to user
    console.log(`[HEARTBEAT] NUDGE: ${item.contact_id}`);
  }

  private async dispatchDraft(item: ActionItem): Promise<void> {
    // Placeholder hook for Member 2 provider integration.
    console.log(
      `[HEARTBEAT] DRAFT: ${item.contact_id} | placeholder draft generated for event ${item.event.id}`
    );
  }

  private async dispatchSilentLog(item: ActionItem): Promise<void> {
    // Silent log intentionally avoids outward notifications.
    console.log(`[HEARTBEAT] SILENT_LOG (no notification): ${item.contact_id}`);
  }

  decideActionType(item: ActionItem): ActionItem['action_type'] {
    if (item.event.type === 'neutral') return 'SILENT_LOG';
    if (item.score >= Math.max(this.actionThreshold + 0.6, 1.2)) return 'DRAFT';
    if (item.score >= this.actionThreshold) return 'NUDGE';
    return 'SILENT_LOG';
  }

  private getActionKey(item: ActionItem, actionType: ActionItem['action_type']): string {
    const threadKey = item.event.thread_id || item.event.id;
    return `${item.contact_id}:${actionType}:${threadKey}`;
  }

  /**
   * Convert interval in ms to cron expression
   */
  private getCronExpression(): string {
    const intervalMs = this.interval;
    if (intervalMs <= 60_000) {
      const seconds = Math.max(1, Math.floor(intervalMs / 1000));
      return `*/${seconds} * * * * *`;
    }
    const minutes = Math.max(1, Math.floor(intervalMs / 60_000));
    return `*/${minutes} * * * *`;
  }
}
