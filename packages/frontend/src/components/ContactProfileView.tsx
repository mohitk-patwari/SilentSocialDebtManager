import type { SOULProfile } from '@ssdm/shared'
import { Link } from 'react-router-dom'

export function ContactProfileView(props: {
  profile: SOULProfile
  compact?: boolean
}) {
  const { profile, compact } = props

  const body = (
    <>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Relationship weight</dt>
          <dd className="font-medium text-slate-900">
            {profile.relationship_weight.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Health</dt>
          <dd className="font-medium text-slate-900">{profile.health_score}/100</dd>
        </div>
        <div>
          <dt className="text-slate-500">Last contact</dt>
          <dd className="font-medium text-slate-900">
            {profile.last_contact.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Contact id</dt>
          <dd className="font-mono text-xs text-slate-800 break-all">
            {profile.contact_id}
          </dd>
        </div>
      </dl>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">
          Open commitments
        </h3>
        {profile.open_commitments.length === 0 ? (
          <p className="text-slate-500 text-sm">None.</p>
        ) : (
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            {profile.open_commitments.map((c, i) => (
              <li key={i}>
                {c.action}{' '}
                <span className="text-slate-500">→ {c.target}</span>
                {c.deadline ? (
                  <span className="text-slate-500">
                    {' '}
                    by {c.deadline.toLocaleDateString()}
                  </span>
                ) : (
                  ''
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!compact ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">
            Interaction timeline
          </h3>
          <ul className="text-sm space-y-2 max-h-64 overflow-y-auto border border-slate-100 rounded-md p-2">
            {profile.interaction_log.length === 0 ? (
              <li className="text-slate-500">Empty.</li>
            ) : (
              [...profile.interaction_log]
                .sort(
                  (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
                )
                .map((r, i) => (
                  <li
                    key={`${r.timestamp.toISOString()}-${i}`}
                    className="border-b border-slate-50 pb-2 last:border-0"
                  >
                    <div className="text-xs text-slate-500 font-mono">
                      {r.timestamp.toLocaleString()}
                    </div>
                    <div className="capitalize">{r.type.replace(/_/g, ' ')}</div>
                  </li>
                ))
            )}
          </ul>
        </section>
      ) : null}
    </>
  )

  return (
    <article className="bg-white rounded-lg shadow border border-slate-100 p-5">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">{profile.name}</h2>
      </header>
      {body}
    </article>
  )
}

export function ContactsList(props: {
  contacts: SOULProfile[]
  loading: boolean
  error: string | null
}) {
  const { contacts, loading, error } = props

  if (loading && contacts.length === 0) {
    return (
      <p className="text-slate-600 text-sm py-6">Loading contacts…</p>
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

  if (contacts.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-6">No contacts in memory yet.</p>
    )
  }

  return (
    <ul className="space-y-3">
      {contacts.map((c) => (
        <li key={c.contact_id}>
          <Link
            to={`/contacts/${encodeURIComponent(c.contact_id)}`}
            className="block bg-white rounded-lg shadow border border-slate-100 p-4 hover:border-indigo-200 transition-colors"
          >
            <div className="flex justify-between gap-2">
              <span className="font-medium text-slate-900">{c.name}</span>
              <span className="text-sm text-emerald-700 font-semibold">
                health {c.health_score}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono mt-1">
              {c.contact_id}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
