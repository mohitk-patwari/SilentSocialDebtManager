/**
 * Telegram Channel Adapter
 * Implements IChannelAdapter for Telegram Bot API
 */

import TelegramBot from 'node-telegram-bot-api';
import { IChannelAdapter } from '../../gateway';
import { MessageEvent } from '../../../../../shared/types';

export class TelegramAdapter implements IChannelAdapter {
  private botToken: string;
  private pollingInterval: number = 5000; // 5 seconds
  private isPolling: boolean = false;
  private messageHandler?: (event: MessageEvent) => void;
  private bot: TelegramBot | null = null;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  }

  async initialize(): Promise<void> {
    console.log('[Telegram] Adapter initialized');
    if (!this.botToken) {
      throw new Error('[Telegram] Missing TELEGRAM_BOT_TOKEN');
    }

    if (!this.bot) {
      this.bot = new TelegramBot(this.botToken, { polling: false });
    }

    try {
      await this.bot.getMe();
    } catch (error) {
      console.error('[Telegram] Bot token validation failed:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    console.log('[Telegram] Polling started');
    if (!this.botToken) {
      throw new Error('[Telegram] Missing TELEGRAM_BOT_TOKEN');
    }

    if (!this.bot) {
      this.bot = new TelegramBot(this.botToken, {
        polling: { interval: this.pollingInterval, autoStart: true },
      });
    }

    this.isPolling = true;
    this.bot.on('message', (msg: TelegramBot.Message) => {
      const event = this.toMessageEvent(msg);
      if (event && this.messageHandler) {
        this.messageHandler(event);
      }
    });
  }

  async stop(): Promise<void> {
    console.log('[Telegram] Polling stopped');
    this.isPolling = false;
    if (this.bot) {
      await this.bot.stopPolling();
    }
  }

  async send(recipient_id: string, message: string): Promise<void> {
    if (!this.bot) {
      console.log('[Telegram] Bot not initialized; cannot send message');
      return;
    }

    const chatId = Number(recipient_id);
    if (!Number.isFinite(chatId)) {
      console.log(`[Telegram] Invalid chat ID: ${recipient_id}`);
      return;
    }
    console.log(`[Telegram] Sending to ${recipient_id}: ${message}`);
    await this.bot.sendMessage(chatId, message);
  }

  setMessageHandler(handler: (event: MessageEvent) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Poll for new messages (long-polling)
   */
  private async poll(): Promise<void> {
    while (this.isPolling) {
      try {
        // TODO: Call getUpdates API
        // TODO: Parse Update objects and emit to gateway
        await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));
      } catch (error) {
        console.error('[Telegram] Polling error:', error);
      }
    }
  }

  /**
   * Parse Telegram Update object
   */
  parseUpdate(update: unknown): MessageEvent | null {
    if (!update || typeof update !== 'object') return null;

    const payload = update as {
      message?: TelegramBot.Message;
      edited_message?: TelegramBot.Message;
      channel_post?: TelegramBot.Message;
    };

    const message = payload.message || payload.edited_message || payload.channel_post;
    if (!message) return null;

    return this.toMessageEvent(message);
  }

  private toMessageEvent(message: TelegramBot.Message): MessageEvent | null {
    if (!message.message_id || !message.chat?.id) return null;

    const senderName = [message.from?.first_name, message.from?.last_name]
      .filter(Boolean)
      .join(' ') || message.from?.username || 'Unknown';

    const timestampMs = message.date * 1000;
    const content = message.text || message.caption || '';

    return {
      id: `${message.chat.id}_${message.message_id}`,
      channel: 'telegram',
      sender: {
        id: String(message.from?.id || message.chat.id),
        name: senderName,
      },
      content,
      timestamp: new Date(Number.isFinite(timestampMs) ? timestampMs : Date.now()),
    };
  }
}
