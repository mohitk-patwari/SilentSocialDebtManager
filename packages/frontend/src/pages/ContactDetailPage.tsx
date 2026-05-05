import { Link, useParams } from 'react-router-dom'
import { ContactProfileView } from '../components/ContactProfileView'
import { useContactDetail } from '../hooks/useContacts'

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const decoded = id ? decodeURIComponent(id) : undefined
  const { profile, loading, error } = useContactDetail(decoded)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <Link
          to="/contacts"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Contacts
        </Link>
        <Link
          to="/"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Dashboard
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-600 text-sm py-10">Loading profile…</p>
      ) : null}

      {error ? (
        <div
          className="rounded-md bg-red-50 text-red-800 text-sm px-3 py-2"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {profile && !loading ? (
        <ContactProfileView profile={profile} compact={false} />
      ) : null}
    </div>
  )
}
