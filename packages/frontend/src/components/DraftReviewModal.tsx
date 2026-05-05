import { useEffect, useState } from 'react'
import type { ActionItem, DraftReply } from '@ssdm/shared'
import { ApiError, approveDraft, dismissAction } from '../api/client'

export function DraftReviewModal(props: {
  action: ActionItem | null
  draft: DraftReply | null
  onClose: () => void
  onDone: () => void
}) {
  const { action, draft, onClose, onDone } = props
  const [edits, setEdits] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (draft) {
      setEdits(draft.draft_text)
    } else {
      setEdits('')
    }
  }, [draft?.id, draft?.draft_text])

  if (!action) return null
  const resolvedAction = action

  async function submitApprove() {
    if (!draft) return
    setBusy(true)
    setErr(null)
    try {
      await approveDraft(
        resolvedAction.id,
        edits.trim() !== (draft.draft_text ?? '').trim() ? edits : undefined,
      )
      onDone()
      onClose()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function submitDismiss() {
    setBusy(true)
    setErr(null)
    try {
      await dismissAction(resolvedAction.id)
      onDone()
      onClose()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const canApprove = !!(draft && draft.status === 'pending')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 id="draft-modal-title" className="text-lg font-semibold text-slate-900">
          Review draft reply
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">{resolvedAction.id}</p>

        <div className="mt-4 text-sm text-slate-700 space-y-2">
          <div>
            <span className="text-slate-500">Original </span>
            <span className="text-xs uppercase text-slate-400">{resolvedAction.event.channel}</span>
          </div>
          <blockquote className="border-l-2 border-slate-200 pl-3 text-slate-600">
            {resolvedAction.event.content}
          </blockquote>
        </div>

        {!draft ? (
          <p className="mt-4 text-sm text-amber-800 bg-amber-50 rounded-md px-3 py-2">
            Waiting for HEARTBEAT or LLM to publish a draft. Approve stays
            disabled until a pending draft arrives (WebSocket{' '}
            <code className="text-xs">draft_ready</code>).
          </p>
        ) : (
          <div className="mt-4">
            <label
              htmlFor="draft-edit"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1"
            >
              Draft (editable)
            </label>
            <textarea
              id="draft-edit"
              className="w-full min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={edits}
              onChange={(e) => setEdits(e.target.value)}
            />
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
              <span>
                Confidence {draft.confidence.toFixed(2)} · Tone{' '}
                {draft.tone.primary}
              </span>
              {draft.suggested_send_time ? (
                <span>
                  Suggested send{' '}
                  {draft.suggested_send_time.toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>
        )}

        {err ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700"
            onClick={() => !busy && onClose()}
          >
            Close
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
            onClick={() => submitDismiss()}
            disabled={busy}
          >
            Dismiss
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            onClick={() => submitApprove()}
            disabled={busy || !canApprove}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}
