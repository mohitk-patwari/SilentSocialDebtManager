/**
 * Gateway - OpenClaw Gateway Module
 * Unified entry point for message ingestion from all channels
 */

import { EventEmitter } from 'events';
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

  /**
   * Optional hook for emitting inbound messages to the gateway
   */
  setMessageHandler?(handler: (event: MessageEvent) => void): void;
}

export class Gateway {
  private adapters: Map<string, IChannelAdapter> = new Map();
  private messageQueue: MessageEvent[] = [];
  private deduplicationCache: Set<string> = new Set();
  private deduplicationOrder: string[] = [];
  private maxDeduplicationSize: number;
  private emitter: EventEmitter = new EventEmitter();
  private lastMessageAt: Date | null = null;

  constructor(maxDeduplicationSize: number = 5000) {
    this.maxDeduplicationSize = maxDeduplicationSize;
  }

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
   * Enqueue a message (with deduplication) and emit to listeners
   */
  ingest(event: MessageEvent): void {
    if (this.deduplicationCache.has(event.id)) {
      console.log(`[Gateway] Duplicate message ignored: ${event.id}`);
      return;
    }

    this.deduplicationCache.add(event.id);
    this.deduplicationOrder.push(event.id);
    this.trimDeduplicationCache();
    this.messageQueue.push(event);
    this.lastMessageAt = new Date();
    this.emitter.emit('message', event);
  }

  /**
   * Subscribe to inbound messages
   */
  onMessage(listener: (event: MessageEvent) => void): () => void {
    this.emitter.on('message', listener);
    return () => this.emitter.off('message', listener);
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

  /**
   * Gateway stats for debugging
   */
  getStats(): { queueSize: number; lastMessageAt: Date | null } {
    return {
      queueSize: this.messageQueue.length,
      lastMessageAt: this.lastMessageAt,
    };
  }

  /**
   * Deduplication cache stats for debugging
   */
  getDedupStats(): { cacheSize: number; maxSize: number } {
    return {
      cacheSize: this.deduplicationCache.size,
      maxSize: this.maxDeduplicationSize,
    };
  }

  private trimDeduplicationCache(): void {
    while (this.deduplicationOrder.length > this.maxDeduplicationSize) {
      const oldest = this.deduplicationOrder.shift();
      if (oldest) {
        this.deduplicationCache.delete(oldest);
      }
    }
  }
}
