import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import './utils/typographyDiagnostic'
import App from './App'

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
