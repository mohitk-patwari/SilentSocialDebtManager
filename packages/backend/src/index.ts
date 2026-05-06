/**
 * Backend Entry Point
 * Initialize and start all services
 */

import 'dotenv/config';
import express from 'express';
import { Gateway } from './gateway/gateway';
import { SoulStore } from './memory/SoulStore';
import { ScoringEngine } from './scheduler/ScoringEngine';
import { ActionQueue } from './scheduler/ActionQueue';
import { HEARTBEAT } from './scheduler/HEARTBEAT';
import { ClassificationEngine } from './nlp/ClassificationEngine';
import { ActionItem, ClassifiedEvent } from '../../shared/types';
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize core services
const gateway = new Gateway();
const soulStore = new SoulStore();
const scoringEngine = new ScoringEngine();
const actionQueue = new ActionQueue();
const heartbeat = new HEARTBEAT(
  actionQueue,
  soulStore,
  parseInt(process.env.HEARTBEAT_INTERVAL || '5000'),
  parseFloat(process.env.ACTION_THRESHOLD || '0.6'),
  parseInt(process.env.TOP_N || '5'),
  process.env.DRY_RUN === 'true'
);
// 🔥 TEST EVENT PIPELINE (simulate incoming event)

(async () => {
  console.log("[Backend] Running test pipeline...");

  const testEvent: ClassifiedEvent = {
  id: "1",
  channel: "gmail",
  sender: {
    id: "recruiter@gmail.com",
    name: "Recruiter",
  },
  content: "Please send your resume",
  timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  type: "unanswered_query",
  confidence: 0.9,
  commitments: [],
  tone_profile: {
    primary: "professional",
    formality_score: 0.8,
    confidence: 0.9,
  },
  entities: {},
};
// 🔥 Demo: generate new event every 15 sec
setInterval(async () => {
  const profile = await soulStore.getProfile("friend@gmail.com");

  const score = scoringEngine.score(testEvent as any, profile);

  const action: ActionItem = {
  id: Date.now().toString(),
  event: testEvent,
  contact_id: "friend@gmail.com",
  action_type: "NUDGE",
  score: 1.2,
  created_at: new Date(),
};

  actionQueue.insert(action);
}, 15000);
  const profile = await soulStore.getProfile(testEvent.sender.id);

  const score = scoringEngine.score(testEvent as any, profile);

  const action: ActionItem = {
  id: Date.now().toString(),
  event: testEvent,
  contact_id: testEvent.sender.id,
  action_type: "SILENT_LOG",
  score,
  created_at: new Date(),
};

  actionQueue.insert(action);

  console.log("[Backend] Inserted action:", action);
})();
// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes placeholder
app.get('/api/queue', (req, res) => {
  res.json({
    queue: actionQueue.peekTop(5),
    total: actionQueue.size(),
    top_n: 5,
  });
});

app.get('/api/contacts', (req, res) => {
  res.json({
    contacts: [],
    total: 0,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Backend] Server running on http://localhost:${PORT}`);
  console.log('[Backend] Starting HEARTBEAT daemon...');
  heartbeat.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Backend] Shutting down...');
  heartbeat.stop();
  process.exit(0);
});
