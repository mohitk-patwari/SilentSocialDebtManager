/**
 * WhatsApp Channel Adapter
 * Implements IChannelAdapter for WhatsApp Business API
 */

import https from 'https';
import { IChannelAdapter } from '../../gateway';
import { MessageEvent } from '../../../../../shared/types';

export class WhatsAppAdapter implements IChannelAdapter {
  private static readonly GRAPH_HOST = 'graph.facebook.com';
  private phoneNumberId: string;
  private apiKey: string;
  private webhookToken: string;
  private messageHandler?: (event: MessageEvent) => void;

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
    if (!this.phoneNumberId || !this.apiKey) {
      console.log('[WhatsApp] Missing phone number ID or API key; send skipped');
      return;
    }

    const payload = JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient_id,
      type: 'text',
      text: { body: message },
    });

    const options: https.RequestOptions = {
      hostname: WhatsAppAdapter.GRAPH_HOST,
      path: `/v17.0/${this.phoneNumberId}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${this.apiKey}`,
      },
    };

    await new Promise<void>((resolve, reject) => {
      const req = https.request(options, (res) => {
        res.on('data', () => undefined);
        res.on('end', () => resolve());
      });

      req.on('error', (error) => reject(error));
      req.write(payload);
      req.end();
    });
  }

  setMessageHandler(handler: (event: MessageEvent) => void): void {
    this.messageHandler = handler;
  }

  async fetchMediaUrl(mediaId: string): Promise<string | null> {
    if (!this.apiKey) {
      console.log('[WhatsApp] Missing API key; media fetch skipped');
      return null;
    }

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: WhatsAppAdapter.GRAPH_HOST,
        path: `/v17.0/${mediaId}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const payload = JSON.parse(data) as { url?: string };
            resolve(payload.url || null);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => reject(error));
      req.end();
    });
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('[WhatsApp] Missing API key; media download blocked');
    }

    return new Promise((resolve, reject) => {
      const url = new URL(mediaUrl);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });

      req.on('error', (error) => reject(error));
      req.end();
    });
  }

  /**
   * Parse incoming webhook payload from Meta
   */
  parseWebhookPayload(payload: unknown): MessageEvent | null {
    if (!payload || typeof payload !== 'object') return null;

    const body = payload as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              id: string;
              from: string;
              timestamp: string;
              type?: string;
              text?: { body?: string };
              image?: { caption?: string; id?: string };
              document?: { caption?: string; filename?: string; id?: string };
              video?: { caption?: string; id?: string };
              audio?: { id?: string };
              voice?: { id?: string };
              sticker?: { id?: string };
              interactive?: { type?: string; button_reply?: { title?: string } };
              button?: { text?: string };
            }>;
            statuses?: Array<{
              id: string;
              recipient_id?: string;
              status?: string;
              timestamp?: string;
            }>;
            contacts?: Array<{ profile?: { name?: string } }>;
          };
        }>;
      }>;
    };

    const change = body.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (message && message.id) {
      const senderName = change?.contacts?.[0]?.profile?.name || 'Unknown';
      const timestampMs = parseInt(message.timestamp, 10) * 1000;
      const content = this.extractContent(message);
      const metadata = this.extractMetadata(message);

      const event: MessageEvent = {
        id: message.id,
        channel: 'whatsapp',
        sender: { id: message.from, name: senderName },
        content,
        timestamp: new Date(Number.isFinite(timestampMs) ? timestampMs : Date.now()),
        metadata: { type: message.type, ...metadata },
      };

      if (this.messageHandler) {
        this.messageHandler(event);
      }

      return event;
    }

    const status = change?.statuses?.[0];
    if (status && status.id) {
      const timestampMs = parseInt(status.timestamp || '0', 10) * 1000;
      const event: MessageEvent = {
        id: status.id,
        channel: 'whatsapp',
        sender: { id: status.recipient_id || 'unknown', name: 'Status Update' },
        content: `status:${status.status || 'unknown'}`,
        timestamp: new Date(Number.isFinite(timestampMs) ? timestampMs : Date.now()),
      };

      if (this.messageHandler) {
        this.messageHandler(event);
      }

      return event;
    }

    return null;
  }

  private extractContent(message: {
    type?: string;
    text?: { body?: string };
    image?: { caption?: string };
    document?: { caption?: string; filename?: string };
    interactive?: { button_reply?: { title?: string } };
    button?: { text?: string };
    video?: { caption?: string };
    audio?: { id?: string };
    voice?: { id?: string };
    sticker?: { id?: string };
  }): string {
    if (message.text?.body) return message.text.body;
    if (message.button?.text) return message.button.text;
    if (message.interactive?.button_reply?.title) return message.interactive.button_reply.title;
    if (message.image?.caption) return message.image.caption;
    if (message.video?.caption) return message.video.caption;
    if (message.document?.caption) return message.document.caption;
    if (message.document?.filename) return message.document.filename;
    if (message.type) return `media:${message.type}`;
    return 'media:unknown';
  }

  private extractMetadata(message: {
    type?: string;
    image?: { id?: string };
    document?: { id?: string; filename?: string };
    video?: { id?: string };
    audio?: { id?: string };
    voice?: { id?: string };
    sticker?: { id?: string };
  }): Record<string, unknown> {
    const mediaId =
      message.image?.id ||
      message.document?.id ||
      message.video?.id ||
      message.audio?.id ||
      message.voice?.id ||
      message.sticker?.id;

    const metadata: Record<string, unknown> = {};
    if (mediaId) {
      metadata.media_id = mediaId;
    }
    if (message.document?.filename) {
      metadata.filename = message.document.filename;
    }

    return metadata;
  }
}
