import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import { AppRouter } from './routes'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)
