import { useEffect, useRef } from 'react'
import type { DraftReply } from '@ssdm/shared'
import { parseDraftReply } from '../lib/parseDates'

type WsPayload =
  | { type: 'queue_update' }
  | { type: 'draft_ready'; data: { draft: unknown } }

export function useQueueWebSocket(
  onQueueUpdate: () => void,
  onDraftReady: (draft: DraftReply) => void,
) {
  const onQueueRef = useRef(onQueueUpdate)
  const onDraftRef = useRef(onDraftReady)

  onQueueRef.current = onQueueUpdate
  onDraftRef.current = onDraftReady

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const base = import.meta.env.VITE_WS_BASE
    const url =
      typeof base === 'string' && base.length > 0
        ? `${base.replace(/\/$/, '')}/ws`
        : `${proto}//${window.location.host}/ws`

    let ws: WebSocket | null = null
    let closed = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (closed) return
      ws = new WebSocket(url)

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as WsPayload
          if (msg.type === 'queue_update') {
            onQueueRef.current()
          }
          if (msg.type === 'draft_ready' && msg.data?.draft !== undefined) {
            onDraftRef.current(parseDraftReply(msg.data.draft))
          }
        } catch {
          /* ignore */
        }
      }

      ws.onclose = () => {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 2000)
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [])
}
