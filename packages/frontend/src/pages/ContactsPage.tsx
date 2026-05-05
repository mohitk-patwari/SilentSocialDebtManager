import { Link } from 'react-router-dom'
import { ContactsList } from '../components/ContactProfileView'
import { useContacts } from '../hooks/useContacts'

export default function ContactsPage() {
  const { contacts, loading, error, refresh } = useContacts()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-slate-800">Contacts</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            Refresh
          </button>
          <Link
            to="/"
            className="text-sm px-3 py-1.5 rounded-md text-indigo-600 hover:bg-indigo-50"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      <ContactsList contacts={contacts} loading={loading} error={error} />
    </div>
  )
}
