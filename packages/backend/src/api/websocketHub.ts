import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { RawData } from 'ws';
import type { DraftReply } from '../../../shared/types';
import { serializeDraft, serializeQueue } from './jsonSerialize';

export interface WebSocketHub {
  broadcastQueue(): void;
  broadcastDraftReady(draft: DraftReply): void;
  close(): void;
}

export function attachWebSocketHub(
  server: Server,
  getQueueSerialized: () => unknown[]
): WebSocketHub {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    clients.add(ws);
    ws.send(
      JSON.stringify({
        type: 'queue_update',
        data: { queue: getQueueSerialized() },
      })
    );

    ws.on('message', (raw: RawData) => {
      try {
        const msg = JSON.parse(String(raw)) as {
          type?: string;
          contact_id?: string;
        };
        if (msg.type === 'subscribe_to_contact') {
          ws.send(
            JSON.stringify({
              type: 'subscribed',
              contact_id: msg.contact_id ?? null,
            })
          );
        }
      } catch {
        /* ignore malformed */
      }
    });

    ws.on('close', () => clients.delete(ws));
  });

  function sendAll(payload: string): void {
    for (const c of clients) {
      if (c.readyState === WebSocket.OPEN) {
        c.send(payload);
      }
    }
  }

  return {
    broadcastQueue(): void {
      sendAll(
        JSON.stringify({
          type: 'queue_update',
          data: { queue: getQueueSerialized() },
        })
      );
    },

    broadcastDraftReady(draft: DraftReply): void {
      sendAll(
        JSON.stringify({
          type: 'draft_ready',
          data: { draft: serializeDraft(draft) },
        })
      );
    },

    close(): void {
      wss.close();
    },
  };
}
