import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ActionItem, DraftReply } from '@ssdm/shared'
import { DebtQueueView } from '../components/DebtQueueView'
import { ActionLogPanel } from '../components/ActionLogPanel'
import { DraftReviewModal } from '../components/DraftReviewModal'
import { useContacts } from '../hooks/useContacts'
import { useQueue } from '../hooks/useQueue'
import { useQueueWebSocket } from '../hooks/useQueueWebSocket'

export default function HomePage() {
  const { queue, loading, error, refresh } = useQueue(80)
  const {
    contacts,
    loading: cloading,
    error: cerr,
    refresh: refreshContacts,
  } = useContacts()
  const [draftReview, setDraftReview] = useState<ActionItem | null>(null)
  const [draftsByActionId, setDraftsByActionId] = useState<
    Record<string, DraftReply>
  >({})

  const reloadAll = useCallback(() => {
    void refresh()
    void refreshContacts()
  }, [refresh, refreshContacts])

  useQueueWebSocket(
    () => reloadAll(),
    (draft) => {
      setDraftsByActionId((prev) => ({ ...prev, [draft.action_id]: draft }))
    },
  )

  return (
    <div className="space-y-10">
      <section className="bg-white rounded-lg shadow-md border border-slate-100 p-6">
        <div className="flex justify-between items-center gap-4 mb-4 flex-wrap">
          <h2 className="text-xl font-semibold text-slate-800">Debt queue</h2>
          <button
            type="button"
            onClick={() => reloadAll()}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            Refresh
          </button>
        </div>
        <DebtQueueView
          items={queue}
          loading={loading}
          error={error}
          onReviewDraft={(item) => setDraftReview(item)}
        />
      </section>

      <section className="bg-white rounded-lg shadow-md border border-slate-100 p-6">
        <div className="flex justify-between items-center gap-4 mb-4 flex-wrap">
          <h2 className="text-xl font-semibold text-slate-800">Action log</h2>
          <Link
            to="/contacts"
            className="text-sm text-indigo-600 hover:underline"
          >
            All contacts →
          </Link>
        </div>
        <ActionLogPanel
          contacts={contacts}
          loading={cloading}
          error={cerr}
        />
      </section>

      <DraftReviewModal
        action={draftReview}
        draft={draftReview ? draftsByActionId[draftReview.id] ?? null : null}
        onClose={() => setDraftReview(null)}
        onDone={reloadAll}
      />
    </div>
  )
}
