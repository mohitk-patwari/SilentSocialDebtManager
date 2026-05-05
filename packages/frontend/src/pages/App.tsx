import React from 'react'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            Silent Social Debt Manager
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Eliminate forgotten follow-ups, unanswered messages, and broken relationship commitments
          </p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              📊 Debt Queue
            </h2>
            <p className="text-gray-600">
              Pending action items sorted by priority score
            </p>
          </section>

          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              👤 Contact Profiles
            </h2>
            <p className="text-gray-600">
              View SOUL.md profiles with relationship health and commitments
            </p>
          </section>
        </main>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>PRISM Hackathon 2026 · OpenClaw Track · Theme 2: Daily Utility</p>
        </footer>
      </div>
    </div>
  )
}
