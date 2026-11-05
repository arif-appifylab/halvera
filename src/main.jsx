import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/design-system/tokens.css'
import '@/design-system/components.css'
import '@/app/theme.js'
import '@/app/palette.js'
import '@/app/design-style.js'
import '@/app/dark-footer.js'
import '@/app/light-version.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
