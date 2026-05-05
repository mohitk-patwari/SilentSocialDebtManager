/**
 * Backend entry: HTTP + WebSocket dashboard API, HEARTBEAT, in-memory contacts.
 */

import 'dotenv/config';
import http from 'http';
import { createApp } from './api/createApp';
import { serializeQueue } from './api/jsonSerialize';
import { attachWebSocketHub } from './api/websocketHub';
import { MemoryContactStore } from './memory/MemoryContactStore';
import { ActionQueue } from './scheduler/ScoringEngine';
import { HEARTBEAT } from './scheduler/HEARTBEAT';
import type { DraftReply } from '../../shared/types';

const PORT = Number(process.env.PORT) || 3000;

const actionQueue = new ActionQueue();
const contactStore = new MemoryContactStore();
const draftsByActionId = new Map<string, DraftReply>();

const heartbeat = new HEARTBEAT(
  actionQueue,
  contactStore,
  parseInt(process.env.HEARTBEAT_INTERVAL || '1800000', 10),
  parseFloat(process.env.ACTION_THRESHOLD || '0.6'),
  parseInt(process.env.TOP_N || '5', 10),
  process.env.DRY_RUN === 'true'
);
let hub: ReturnType<typeof attachWebSocketHub> | null = null;

const app = createApp({
  actionQueue,
  contactStore,
  draftsByActionId,
  notifyChange: () => hub?.broadcastQueue(),
});

const server = http.createServer(app);

hub = attachWebSocketHub(server, () =>
  serializeQueue(actionQueue.peekTop(100))
);

server.listen(PORT, () => {
  console.log(`[Backend] Server running on http://localhost:${PORT}`);
  console.log('[Backend] WebSocket at ws://localhost:' + PORT + '/ws');
  console.log('[Backend] Starting HEARTBEAT daemon...');
  heartbeat.start();
});

process.on('SIGINT', () => {
  console.log('[Backend] Shutting down...');
  heartbeat.stop();
  hub?.close();
  server.close(() => process.exit(0));
});
