/**
 * Backend Entry Point
 * Initialize and start all services
 */

import 'dotenv/config';
import express from 'express';
import { Gateway } from './gateway/gateway';
import { SoulStore } from './memory/SoulStore';
import { ScoringEngine, ActionQueue } from './scheduler/ScoringEngine';
import { HEARTBEAT } from './scheduler/HEARTBEAT';
import { ClassificationEngine } from './nlp/ClassificationEngine';

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
  parseInt(process.env.HEARTBEAT_INTERVAL || '1800000'),
  parseFloat(process.env.ACTION_THRESHOLD || '0.6'),
  parseInt(process.env.TOP_N || '5'),
  process.env.DRY_RUN === 'true'
);

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
