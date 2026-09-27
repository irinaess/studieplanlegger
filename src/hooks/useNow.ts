import { useEffect, useState } from 'react'
import { osloNow } from '../lib/time'

/**
 * Gir nåtiden i norsk tid, og oppdaterer den hvert minutt.
 * Da bytter hilsenen automatisk fra "God morgen" til "God formiddag" kl. 10,
 * og nedtellingene holder seg riktige hvis appen står åpen hele dagen.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(osloNow)
  useEffect(() => {
    const id = setInterval(() => setNow(osloNow()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
