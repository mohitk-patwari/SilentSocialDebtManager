/**
 * Gmail Channel Adapter
 * Implements IChannelAdapter for Gmail API
 */

import { promises as fs } from 'fs';
import path from 'path';
import { google } from 'googleapis';
import type { Credentials, OAuth2Client } from 'google-auth-library';
import { IChannelAdapter } from '../../gateway';
import { MessageEvent } from '../../../../../shared/types';

export class GmailAdapter implements IChannelAdapter {
  private static readonly GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
  ];

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private pollingInterval: number = 30000; // 30 seconds
  private isPolling: boolean = false;
  private messageHandler?: (event: MessageEvent) => void;
  private tokenPath: string;
  private oauth2Client: OAuth2Client | null = null;
  private gmail: ReturnType<typeof google.gmail> | null = null;

  constructor() {
    this.clientId = process.env.GMAIL_CLIENT_ID || '';
    this.clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
    this.redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/gmail/callback';
    this.tokenPath = process.env.GMAIL_TOKEN_PATH || path.join(process.cwd(), 'gmail_token.json');
  }

  async initialize(): Promise<void> {
    console.log('[Gmail] Adapter initialized');
    if (!this.clientId || !this.clientSecret) {
      throw new Error('[Gmail] Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET');
    }

    const client = this.ensureOAuthClient();
    client.on('tokens', (tokens) => {
      if (tokens.access_token || tokens.refresh_token) {
        void this.saveToken(tokens);
      }
    });

    const token = await this.loadToken();
    if (!token) {
      console.log('[Gmail] No token found. Authorize this app by visiting:');
      console.log(this.getAuthUrl());
      return;
    }

    client.setCredentials(token);
    this.gmail = google.gmail({ version: 'v1', auth: client });
  }

  async start(): Promise<void> {
    console.log('[Gmail] Polling started');
    if (!this.gmail) {
      console.log('[Gmail] Gmail client not ready; skipping polling');
      return;
    }
    this.isPolling = true;
    this.poll();
  }

  async stop(): Promise<void> {
    console.log('[Gmail] Polling stopped');
    this.isPolling = false;
  }

  async send(recipient_id: string, message: string): Promise<void> {
    console.log(`[Gmail] Sending to ${recipient_id}: ${message}`);
    // TODO: Call Gmail API to send message
  }

  async getAuthStatus(): Promise<{ tokenLoaded: boolean; clientReady: boolean; tokenPath: string }> {
    const token = await this.loadToken();
    return {
      tokenLoaded: Boolean(token),
      clientReady: Boolean(this.gmail),
      tokenPath: this.tokenPath,
    };
  }

  getAuthUrl(): string {
    const client = this.ensureOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GmailAdapter.GMAIL_SCOPES,
    });
  }

  async exchangeCodeForToken(code: string): Promise<void> {
    const client = this.ensureOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    await this.saveToken(tokens);
    this.gmail = google.gmail({ version: 'v1', auth: client });
  }

  setMessageHandler(handler: (event: MessageEvent) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Poll for new unread messages
   */
  private async poll(): Promise<void> {
    while (this.isPolling) {
      try {
        if (!this.gmail) {
          await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));
          continue;
        }

        const listResponse = await this.gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread',
          maxResults: 5,
        });

        const messages = listResponse.data.messages || [];
        for (const msg of messages) {
          if (!msg.id) continue;

          const messageResponse = await this.gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
          });

          const event = this.parseMessage(messageResponse.data);
          if (event && this.messageHandler) {
            this.messageHandler(event);
          }

          await this.markAsRead(msg.id);
        }

        await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));
      } catch (error) {
        console.error('[Gmail] Polling error:', error);
      }
    }
  }

  /**
   * Parse Gmail message
   */
  parseMessage(message: unknown): MessageEvent | null {
    if (!message || typeof message !== 'object') return null;

    const payload = message as {
      id?: string;
      threadId?: string;
      internalDate?: string;
      snippet?: string;
      payload?: {
        headers?: Array<{ name?: string; value?: string }>;
      };
    };

    if (!payload.id) return null;

    const headers = payload.payload?.headers || [];
    const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || 'Unknown';
    const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';
    const parsedFrom = this.parseFromHeader(fromHeader);
    const timestampMs = parseInt(payload.internalDate || '0', 10);

    const event: MessageEvent = {
      id: payload.id,
      channel: 'gmail',
      sender: { id: parsedFrom.email || fromHeader, name: parsedFrom.name || fromHeader, email: parsedFrom.email },
      content: [subject, payload.snippet || ''].filter(Boolean).join('\n'),
      timestamp: new Date(Number.isFinite(timestampMs) ? timestampMs : Date.now()),
      thread_id: payload.threadId,
      metadata: { subject },
    };

    if (this.messageHandler) {
      this.messageHandler(event);
    }

    return event;
  }

  private parseFromHeader(value: string): { name?: string; email?: string } {
    const match = value.match(/^(.*)<(.+)>$/);
    if (match) {
      return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
    }

    if (value.includes('@')) {
      return { email: value.trim() };
    }

    return { name: value.trim() };
  }

  private ensureOAuthClient(): OAuth2Client {
    if (!this.oauth2Client) {
      this.oauth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        this.redirectUri
      );
    }

    return this.oauth2Client;
  }

  private async loadToken(): Promise<Credentials | null> {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf-8');
      return JSON.parse(data) as Credentials;
    } catch {
      return null;
    }
  }

  private async saveToken(token: Credentials): Promise<void> {
    const existing = await this.loadToken();
    const merged = { ...(existing || {}), ...token };
    await fs.writeFile(this.tokenPath, JSON.stringify(merged, null, 2), 'utf-8');
  }

  private async markAsRead(messageId: string): Promise<void> {
    if (!this.gmail) return;

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
    } catch (error) {
      console.error('[Gmail] Failed to mark message as read:', error);
    }
  }
}
