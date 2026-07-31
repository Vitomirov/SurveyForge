import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider, BackToTop } from '@/components/ui'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
      <BackToTop />
    </ToastProvider>
  </StrictMode>,
)
