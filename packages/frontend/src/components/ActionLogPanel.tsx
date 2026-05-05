import type { InteractionRecord, SOULProfile } from '@ssdm/shared'

type Enriched = InteractionRecord & {
  contact_id: string
  contact_name: string
}

export function buildActionLog(contacts: SOULProfile[]): Enriched[] {
  const rows: Enriched[] = []
  for (const c of contacts) {
    for (const r of c.interaction_log) {
      rows.push({
        ...r,
        contact_id: c.contact_id,
        contact_name: c.name || c.contact_id,
      })
    }
  }
  rows.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  return rows
}

export function ActionLogPanel(props: {
  contacts: SOULProfile[]
  loading: boolean
  error: string | null
}) {
  const { contacts, loading, error } = props
  const rows = buildActionLog(contacts)

  if (loading && contacts.length === 0) {
    return (
      <p className="text-slate-600 text-sm py-4">Loading interaction log…</p>
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

  if (rows.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-4">
        No HEARTBEAT or approval events recorded yet (merged from SOUL
        profiles).
      </p>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto text-sm">
      {rows.slice(0, 80).map((r, i) => (
        <li key={`${r.contact_id}-${r.timestamp.toISOString()}-${i}`} className="py-2">
          <div className="flex flex-wrap gap-x-2 gap-y-1 justify-between">
            <span className="text-slate-500 font-mono text-xs">
              {r.timestamp.toLocaleString()}
            </span>
            <span className="text-slate-700">
              {r.contact_name}{' '}
              <span className="text-slate-400">({r.contact_id})</span>
            </span>
          </div>
          <div className="text-slate-800 mt-1">
            <span className="capitalize">{r.type.replace(/_/g, ' ')}</span>
            {' · '}
            score {r.score.toFixed(2)}
            {r.action_taken ? (
              <>
                {' · '}
                <span className="text-indigo-700">{r.action_taken}</span>
              </>
            ) : null}
            {r.draft_id ? (
              <>
                {' · '}
                <span className="text-slate-600">draft {r.draft_id}</span>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
