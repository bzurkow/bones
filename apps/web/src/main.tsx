import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from 'react-ui'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
