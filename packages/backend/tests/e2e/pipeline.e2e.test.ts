import request from 'supertest';
import sinon from 'sinon';
import { createApp } from '../../src/api/createApp';
import { MemoryContactStore } from '../../src/memory/MemoryContactStore';
import { ActionQueue } from '../../src/scheduler/ScoringEngine';
import { HEARTBEAT } from '../../src/scheduler/HEARTBEAT';
import type { DraftReply } from '../../../shared/types';
import {
  makeActionItem,
  makeClassifiedEvent,
  makePendingDraft,
  sampleCommitment,
} from './helpers';

function buildSuite() {
  const actionQueue = new ActionQueue();
  const contactStore = new MemoryContactStore();
  const draftsByActionId = new Map<string, DraftReply>();
  const app = createApp({
    actionQueue,
    contactStore,
    draftsByActionId,
  });
  return { app, actionQueue, contactStore, draftsByActionId };
}

describe('E2E (mocked) — dashboard API & pipeline', () => {
  test('1) Inbound message → classification appears on queue', async () => {
    const { app, actionQueue } = buildSuite();
    const ev = makeClassifiedEvent({
      type: 'unanswered_query',
      content: 'When can we meet?',
    });
    actionQueue.insert(
      makeActionItem({
        id: 'act_1',
        contact_id: 'alice',
        score: 0.88,
        action_type: 'NUDGE',
        event: ev,
      }),
    );

    const res = await request(app).get('/api/queue?top_n=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.queue).toHaveLength(1);
    expect(res.body.data.queue[0].event.type).toBe('unanswered_query');
  });

  test('2) Commitment merged into SOUL profile', async () => {
    const { app, contactStore } = buildSuite();
    await contactStore.mergeOpenCommitments('bob', [sampleCommitment()]);

    const res = await request(app).get('/api/contacts/bob');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.open_commitments).toHaveLength(1);
    expect(res.body.data.open_commitments[0].action).toContain('notes');
  });

  test('3) HEARTBEAT tick writes NUDGE interaction for high-score item', async () => {
    const clock = sinon.useFakeTimers({
      now: new Date('2026-03-01T12:00:00Z'),
      shouldAdvanceTime: true,
    });
    try {
      const { actionQueue, contactStore } = buildSuite();
      const hb = new HEARTBEAT(
        actionQueue,
        contactStore,
        1800000,
        0.5,
        5,
        false,
      );

      clock.tick(2 * 60 * 60 * 1000); // advance mock clock (+2 hours)

      const ev = makeClassifiedEvent({
        type: 'unanswered_query',
        content: 'Ping',
      });
      actionQueue.insert(
        makeActionItem({
          id: 'act_nudge',
          contact_id: 'carol',
          score: 0.95,
          action_type: 'NUDGE',
          event: ev,
        }),
      );

      contactStore.resetObservability();
      await hb.runTickOnce();

      expect(
        contactStore.interactionsAppended.some(
          (x) =>
            x.record.action_taken === 'NUDGE' && x.contactId === 'carol',
        ),
      ).toBe(true);
    } finally {
      clock.restore();
    }
  });

  test('4) Gmail-originated event retains thread_id on queue payload', async () => {
    const { app, actionQueue } = buildSuite();
    const ev = makeClassifiedEvent({
      channel: 'gmail',
      type: 'neutral',
      content: 'Thread reply',
      thread_id: 'thread-abc-123',
    });
    actionQueue.insert(
      makeActionItem({
        id: 'act_g',
        contact_id: 'dana',
        score: 0.4,
        action_type: 'SILENT_LOG',
        event: ev,
      }),
    );

    const res = await request(app).get('/api/queue');
    expect(res.status).toBe(200);
    expect(res.body.data.queue[0].event.thread_id).toBe('thread-abc-123');
    expect(res.body.data.queue[0].event.channel).toBe('gmail');
  });

  test('5) Stubbed DraftReply aligns with queued DRAFT action for review', async () => {
    const { app, actionQueue, draftsByActionId } = buildSuite();
    const id = 'act_dr5';
    const ev = makeClassifiedEvent({
      type: 'unanswered_query',
      content: 'Can you confirm?',
    });
    actionQueue.insert(
      makeActionItem({
        id,
        contact_id: 'frank',
        score: 0.82,
        action_type: 'DRAFT',
        event: ev,
      }),
    );
    draftsByActionId.set(id, makePendingDraft(id));

    const draft = draftsByActionId.get(id)!;
    expect(draft.draft_text.length).toBeGreaterThan(0);
    expect(draft.confidence).toBeGreaterThan(0.7);
    expect(draft.status).toBe('pending');

    const res = await request(app).get('/api/queue');
    expect(res.status).toBe(200);
    const row = res.body.data.queue.find((x: { id: string }) => x.id === id);
    expect(row).toBeDefined();
    expect(row.action_type).toBe('DRAFT');
  });

  test('6) Approve draft removes action and logs interaction', async () => {
    const { app, actionQueue, contactStore, draftsByActionId } = buildSuite();
    const id = 'act_draft_6';
    const ev = makeClassifiedEvent({
      type: 'commitment_made',
      content: "I'll send the doc tomorrow.",
    });
    actionQueue.insert(
      makeActionItem({
        id,
        contact_id: 'erin',
        score: 0.91,
        action_type: 'DRAFT',
        event: ev,
      }),
    );
    const draft = makePendingDraft(id);
    draftsByActionId.set(id, draft);

    const approve = await request(app)
      .post(`/api/action/${id}/approve`)
      .send({ edits: 'Thanks — I will send the document tomorrow morning.' });

    expect(approve.status).toBe(200);
    expect(approve.body.success).toBe(true);
    expect(approve.body.draft_id).toBe(draft.id);

    const q = await request(app).get('/api/queue?top_n=20');
    expect(q.body.data.queue.find((x: { id: string }) => x.id === id)).toBeUndefined();

    const profile = await contactStore.getProfile('erin');
    expect(
      profile?.interaction_log.some(
        (r) => r.action_taken === 'DRAFT' && r.draft_id === draft.id,
      ),
    ).toBe(true);
  });
});
