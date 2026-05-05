import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './pages/App'
import ContactDetailPage from './pages/ContactDetailPage'
import ContactsPage from './pages/ContactsPage'
import HomePage from './pages/HomePage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'contacts/:id', element: <ContactDetailPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
