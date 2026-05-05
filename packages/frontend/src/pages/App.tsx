import { NavLink, Outlet } from 'react-router-dom'

const linkClass =
  'px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-slate-100 text-slate-700'
const activeClass = 'bg-indigo-100 text-indigo-900 hover:bg-indigo-100'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-10 text-center sm:text-left">
          <nav className="flex flex-wrap gap-2 justify-center sm:justify-start mb-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${linkClass} ${isActive ? activeClass : ''}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/contacts"
              className={({ isActive }) =>
                `${linkClass} ${isActive ? activeClass : ''}`
              }
            >
              Contacts
            </NavLink>
          </nav>

          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Silent Social Debt Manager
          </h1>
          <p className="text-lg text-slate-600 mt-2 max-w-2xl">
            Autonomous prioritization of unanswered messages and relationship
            drift — inbox, Telegram, Gmail.
          </p>
        </header>

        <main>
          <Outlet />
        </main>

        <footer className="text-center mt-16 text-slate-500 text-sm">
          PRISM Hackathon · OpenClaw Track · Theme 2: Daily Utility
        </footer>
      </div>
    </div>
  )
}
