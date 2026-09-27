import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DesignLab } from './design-lab/DesignLab.tsx'

/** Følger med på #-delen av adressen, så vi kan bytte side uten å laste på nytt. */
function useHash() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('hashchange', onChange)
      return () => window.removeEventListener('hashchange', onChange)
    },
    () => window.location.hash,
  )
}

function Root() {
  const hash = useHash()
  // Midlertidig: designforslagene ligger under #/design. Fjernes når et design er valgt.
  return hash.startsWith('#/design') ? <DesignLab hash={hash} /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
