import type { ActionItem } from '@ssdm/shared'

const channelLabel: Record<ActionItem['event']['channel'], string> = {
  whatsapp: 'WA',
  telegram: 'TG',
  gmail: 'Mail',
}

export function DebtQueueView(props: {
  items: ActionItem[]
  loading: boolean
  error: string | null
  onReviewDraft: (item: ActionItem) => void
}) {
  const { items, loading, error, onReviewDraft } = props

  if (loading && items.length === 0) {
    return (
      <p className="text-slate-600 text-sm py-6">Loading debt queue…</p>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-md bg-red-50 text-red-800 text-sm px-3 py-2"
        role="alert"
      >
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-6">
        No pending actions. Ingested messages with social debt will appear
        here ranked by score.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-600">
            <th className="py-2 pr-2 font-medium">Score</th>
            <th className="py-2 pr-2 font-medium">Ch</th>
            <th className="py-2 pr-2 font-medium">Contact</th>
            <th className="py-2 pr-2 font-medium">Type</th>
            <th className="py-2 font-medium">Preview</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 hover:bg-slate-50/80"
            >
              <td className="py-2 pr-2 align-top whitespace-nowrap">
                <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-xs font-semibold">
                  {item.score.toFixed(2)}
                </span>
              </td>
              <td className="py-2 pr-2 align-top text-slate-500 font-mono text-xs">
                {channelLabel[item.event.channel]}
              </td>
              <td className="py-2 pr-2 align-top">
                <span className="font-medium text-slate-800">
                  {item.event.sender.name || item.contact_id}
                </span>
                <div className="text-xs text-slate-500">{item.contact_id}</div>
              </td>
              <td className="py-2 pr-2 align-top capitalize text-slate-700">
                <div>{item.event.type.replace(/_/g, ' ')}</div>
                <div className="text-xs text-slate-500">
                  {item.action_type}
                  {item.action_type === 'DRAFT' ? (
                    <button
                      type="button"
                      className="ml-2 text-indigo-600 hover:underline"
                      onClick={() => onReviewDraft(item)}
                    >
                      Review
                    </button>
                  ) : null}
                </div>
              </td>
              <td className="py-2 align-top text-slate-600 max-w-md">
                <span className="line-clamp-2">
                  {item.event.content.slice(0, 200)}
                  {item.event.content.length > 200 ? '…' : ''}
                </span>
                {item.event.thread_id ? (
                  <div className="text-xs text-slate-400 mt-1">
                    thread {item.event.thread_id}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
