import crypto from 'crypto';
import express from 'express';
import { Gateway } from './gateway/gateway';
import { SoulStore } from './memory/SoulStore';
import { ScoringEngine } from './scheduler/ScoringEngine';
import { ActionQueue } from './scheduler/ActionQueue';
import { HEARTBEAT } from './scheduler/HEARTBEAT';
import { WhatsAppAdapter } from './gateway/adapters/whatsapp/WhatsAppAdapter';
import { TelegramAdapter } from './gateway/adapters/telegram/TelegramAdapter';
import { GmailAdapter } from './gateway/adapters/gmail/GmailAdapter';

export function createApp() {
  const app = express();

  const gateway = new Gateway();
  const soulStore = new SoulStore();
  const scoringEngine = new ScoringEngine();
  const actionQueue = new ActionQueue();
  const heartbeat = new HEARTBEAT(
    actionQueue,
    soulStore,
    parseInt(process.env.HEARTBEAT_INTERVAL || '1800000'),
    parseFloat(process.env.ACTION_THRESHOLD || '0.6'),
    parseInt(process.env.TOP_N || '5'),
    process.env.DRY_RUN === 'true'
  );

  const whatsAppAdapter = new WhatsAppAdapter();
  const telegramAdapter = new TelegramAdapter();
  const gmailAdapter = new GmailAdapter();

  app.use(express.json({
    verify: (req, _res, buf) => {
      (req as { rawBody?: Buffer }).rawBody = buf;
    },
  }));

  gateway.registerAdapter('whatsapp', whatsAppAdapter);
  gateway.registerAdapter('telegram', telegramAdapter);
  gateway.registerAdapter('gmail', gmailAdapter);

  whatsAppAdapter.setMessageHandler?.((event) => gateway.ingest(event));
  telegramAdapter.setMessageHandler?.((event) => gateway.ingest(event));
  gmailAdapter.setMessageHandler?.((event) => gateway.ingest(event));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/gateway/stats', (req, res) => {
    res.json(gateway.getStats());
  });

  app.get('/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
  });

  app.post('/webhook/whatsapp', (req, res) => {
    if (!verifyWhatsAppSignature(req)) {
      res.sendStatus(401);
      return;
    }

    const event = whatsAppAdapter.parseWebhookPayload(req.body);
    if (event) {
      gateway.ingest(event);
    }

    res.sendStatus(200);
  });

  app.get('/auth/gmail', (req, res) => {
    const authUrl = gmailAdapter.getAuthUrl();
    res.redirect(authUrl);
  });

  app.get('/auth/gmail/callback', async (req, res) => {
    const code = req.query.code;
    if (!code || Array.isArray(code)) {
      res.status(400).json({ success: false, error: 'Missing Gmail auth code' });
      return;
    }

    try {
      await gmailAdapter.exchangeCodeForToken(code);
      res.json({ success: true });
    } catch (error) {
      console.error('[Gmail] OAuth callback error:', error);
      res.status(500).json({ success: false, error: 'Failed to exchange Gmail auth code' });
    }
  });

  app.get('/api/gmail/status', async (_req, res) => {
    const status = await gmailAdapter.getAuthStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date(),
    });
  });

  app.get('/api/queue', (req, res) => {
    const topN = parseInt(String(req.query.top_n || '5'), 10);
    res.json({
      success: true,
      data: {
        queue: actionQueue.peekTop(topN),
        total: actionQueue.size(),
        top_n: topN,
      },
      timestamp: new Date(),
    });
  });

  app.get('/api/contacts', async (req, res) => {
    try {
      const limit = Math.max(0, parseInt(String(req.query.limit || '10'), 10));
      const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10));
      const contacts = await soulStore.listContacts();
      const paged = contacts.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          contacts: paged,
          total: contacts.length,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[Contacts] Failed to list contacts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list contacts',
        timestamp: new Date(),
      });
    }
  });

  app.get('/api/contacts/:id', async (req, res) => {
    try {
      const profile = await soulStore.getProfile(req.params.id);
      res.json(profile);
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Contact not found',
        timestamp: new Date(),
      });
    }
  });

  app.post('/api/action/:id/approve', (req, res) => {
    const actionId = req.params.id;
    res.json({
      success: true,
      draft_id: actionId,
    });
  });

  app.post('/api/action/:id/dismiss', (req, res) => {
    res.json({
      success: true,
    });
  });

  return { app, gateway, actionQueue, heartbeat, scoringEngine, soulStore };
}

function verifyWhatsAppSignature(req: express.Request): boolean {
  const signature = req.header('x-hub-signature-256');
  if (!signature) return true;

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[WhatsApp] Signature header present but WHATSAPP_APP_SECRET is missing');
    return false;
  }

  const rawBody = (req as { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    console.error('[WhatsApp] Missing raw body for signature verification');
    return false;
  }

  const hmac = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const expected = `sha256=${hmac}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
