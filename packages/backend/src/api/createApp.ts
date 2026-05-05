/**
 * REST API wired to injected services (dashboard + Supertest).
 */

import express, { Express, Response } from 'express';
import type { DraftReply, SOULProfile } from '../../../shared/types';
import { ApiResponse } from '../../../shared/types';
import { MemoryContactStore } from '../memory/MemoryContactStore';
import { ActionQueue } from '../scheduler/ScoringEngine';
import { serializeQueue, toJsonISO } from './jsonSerialize';

export interface CreateAppOptions {
  actionQueue: ActionQueue;
  contactStore: MemoryContactStore;
  draftsByActionId: Map<string, DraftReply>;
  /** Invoke after queue or drafts mutate (broadcast WebSocket) */
  notifyChange?: () => void;
}

function ok<T>(
  data: T
): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date(),
  };
}

function fail(res: Response, status: number, message: string): void {
  res.status(status).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
}

export function createApp(opts: CreateAppOptions): Express {
  const app = express();
  app.use(express.json());

  const ping = (): void => {
    opts.notifyChange?.();
  };

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/queue', (req, res) => {
    const topNRaw = Number(req.query.top_n ?? 5);
    const topN =
      Number.isFinite(topNRaw) && topNRaw > 0 ? Math.floor(topNRaw) : 5;
    const queue = opts.actionQueue.peekTop(topN);
    const payload: ApiResponse<{ queue: unknown[]; total: number; top_n: number }> =
      ok({
        queue: serializeQueue(queue),
        total: opts.actionQueue.size(),
        top_n: topN,
      });
    res.json(payload);
  });

  app.get('/api/contacts', async (req, res) => {
    const limitRaw = Number(req.query.limit ?? 50);
    const offsetRaw = Number(req.query.offset ?? 0);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 50;
    const offset =
      Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;

    try {
      const { contacts, total } = await opts.contactStore.listContacts(limit, offset);
      res.json(
        ok({
          contacts: contacts.map((c) => toJsonISO(c)) as unknown[],
          total,
        })
      );
    } catch {
      fail(res, 500, 'Failed to load contacts');
    }
  });

  app.get('/api/contacts/:id', async (req, res) => {
    try {
      const profile = await opts.contactStore.getProfile(req.params.id);
      if (!profile) {
        fail(res, 404, 'Contact not found');
        return;
      }
      res.json(ok(toJsonISO(profile) as SOULProfile));
    } catch {
      fail(res, 500, 'Failed to load contact');
    }
  });

  app.post('/api/action/:id/approve', async (req, res) => {
    const actionId = req.params.id;
    const item = opts.actionQueue.findById(actionId);
    if (!item) {
      fail(res, 404, 'Action not found');
      return;
    }

    const draft = opts.draftsByActionId.get(actionId);
    if (!draft) {
      fail(res, 400, 'No pending draft for this action');
      return;
    }

    const edits =
      typeof req.body?.edits === 'string' ? (req.body.edits as string) : undefined;
    const finalized: DraftReply = {
      ...draft,
      draft_text: edits ?? draft.draft_text,
      status: 'approved',
    };

    opts.draftsByActionId.delete(actionId);
    opts.actionQueue.remove(actionId);

    try {
      await opts.contactStore.writeInteraction(item.contact_id, {
        timestamp: new Date(),
        type: item.event.type,
        score: item.score,
        action_taken: 'DRAFT',
        draft_id: finalized.id,
      });
    } catch {
      /* still acknowledge approval */
    }

    ping();

    res.json({
      success: true,
      draft_id: finalized.id,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/action/:id/dismiss', async (req, res) => {
    const actionId = req.params.id;
    const item = opts.actionQueue.findById(actionId);
    if (!item) {
      fail(res, 404, 'Action not found');
      return;
    }

    opts.draftsByActionId.delete(actionId);
    opts.actionQueue.remove(actionId);

    try {
      await opts.contactStore.writeInteraction(item.contact_id, {
        timestamp: new Date(),
        type: item.event.type,
        score: item.score,
        action_taken: item.action_type === 'DRAFT' ? 'DRAFT' : 'NUDGE',
      });
    } catch {
      /* ignore */
    }

    ping();
    res.json({ success: true, timestamp: new Date().toISOString() });
  });

  return app;
}
