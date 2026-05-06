/**
 * Backend Entry Point
 * Initialize and start all services
 */

import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { createApp } from './app';
import { loadConfig, validateConfig } from './config/env';

const config = loadConfig();
validateConfig(config);

const PORT = config.port;
const { app, gateway, heartbeat, actionQueue } = createApp();

const server = app.listen(PORT, async () => {
  console.log(`[Backend] Server running on http://localhost:${PORT}`);
  console.log('[Backend] Starting HEARTBEAT daemon...');
  heartbeat.start();

  await gateway.initialize();
  await gateway.start();
});

const wss = new WebSocketServer({ server, path: '/ws' });
gateway.onMessage((event) => {
  const payload = JSON.stringify({
    type: 'queue_update',
    data: { queue: actionQueue.peekTop(5) },
  });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
});

process.on('SIGINT', () => {
  console.log('[Backend] Shutting down...');
  heartbeat.stop();
  wss.close();
  process.exit(0);
});
