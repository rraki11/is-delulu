import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import './utils/typographyDiagnostic'
import App from './App'
import { perfTracker } from '../../shared/perf'

if (typeof window !== 'undefined' && window.isDelulu?.getMainStartTime) {
  try {
    const mainStart = window.isDelulu.getMainStartTime()
    if (typeof mainStart === 'number' && mainStart > 0) {
      perfTracker.setStartTime(mainStart)
    }
  } catch {
    // fallback to local process timestamp
  }
}

perfTracker.record('renderer_mounting')

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
