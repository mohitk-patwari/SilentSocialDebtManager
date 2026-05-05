/**
 * WhatsApp Channel Adapter
 * Implements IChannelAdapter for WhatsApp Business API
 */

import { IChannelAdapter } from '../../gateway';
import { MessageEvent } from '../../../../shared/types';

export class WhatsAppAdapter implements IChannelAdapter {
  private phoneNumberId: string;
  private apiKey: string;
  private webhookToken: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.apiKey = process.env.WHATSAPP_API_KEY || '';
    this.webhookToken = process.env.WHATSAPP_WEBHOOK_TOKEN || '';
  }

  async initialize(): Promise<void> {
    console.log('[WhatsApp] Adapter initialized');
    // TODO: Validate credentials with Meta API
  }

  async start(): Promise<void> {
    console.log('[WhatsApp] Webhook listener started');
    // TODO: Set up Express webhook endpoint
  }

  async stop(): Promise<void> {
    console.log('[WhatsApp] Webhook listener stopped');
  }

  async send(recipient_id: string, message: string): Promise<void> {
    console.log(`[WhatsApp] Sending to ${recipient_id}: ${message}`);
    // TODO: Call WhatsApp Business API sendMessage endpoint
  }

  /**
   * Parse incoming webhook payload from Meta
   */
  parseWebhookPayload(payload: unknown): MessageEvent | null {
    // TODO: Extract message, sender, timestamp from Meta's webhook format
    return null;
  }
}
