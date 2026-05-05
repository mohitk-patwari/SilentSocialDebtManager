/**
 * Gateway - OpenClaw Gateway Module
 * Unified entry point for message ingestion from all channels
 */

import { MessageEvent } from '../../../shared/types';

export interface IChannelAdapter {
  /**
   * Initialize the channel adapter with necessary credentials
   */
  initialize(): Promise<void>;

  /**
   * Start listening for incoming messages
   */
  start(): Promise<void>;

  /**
   * Stop listening
   */
  stop(): Promise<void>;

  /**
   * Send a message to a contact
   */
  send(recipient_id: string, message: string): Promise<void>;
}

export class Gateway {
  private adapters: Map<string, IChannelAdapter> = new Map();
  private messageQueue: MessageEvent[] = [];
  private deduplicationCache: Set<string> = new Set();

  constructor() {}

  /**
   * Register a channel adapter
   */
  registerAdapter(channel: string, adapter: IChannelAdapter): void {
    this.adapters.set(channel, adapter);
  }

  /**
   * Initialize all registered adapters
   */
  async initialize(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.initialize();
    }
  }

  /**
   * Start all adapters
   */
  async start(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.start();
    }
  }

  /**
   * Enqueue a message (with deduplication)
   */
  enqueueMessage(event: MessageEvent): void {
    if (this.deduplicationCache.has(event.id)) {
      console.log(`[Gateway] Duplicate message ignored: ${event.id}`);
      return;
    }

    this.deduplicationCache.add(event.id);
    this.messageQueue.push(event);
  }

  /**
   * Peek at the message queue
   */
  peekQueue(): MessageEvent[] {
    return [...this.messageQueue];
  }

  /**
   * Dequeue a message
   */
  dequeueMessage(): MessageEvent | undefined {
    return this.messageQueue.shift();
  }

  /**
   * Get queue size
   */
  queueSize(): number {
    return this.messageQueue.length;
  }
}
