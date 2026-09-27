import { Link, useLocation } from 'react-router'
import { useSubjects } from '../data/api'
import { formatClock, remainingMs } from '../lib/timer'
import { useFocus } from './FocusContext'

/** Liten timerlinje nederst på skjermen, på alle sider unntatt Fokus-siden. */
export function FocusBar() {
  const { state, now, pause, resume } = useFocus()
  const subjects = useSubjects()
  const location = useLocation()
  if (!state || location.pathname === '/fokus') return null

  const subject = subjects.data?.find((s) => s.id === state.subjectId)
  const running = state.runningSince !== null

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 motion-safe:animate-rise">
      <div className="flex items-center gap-3 rounded-full bg-ink/95 py-1.5 pr-1.5 pl-5 text-paper shadow-[0_10px_30px_-10px_rgba(50,45,41,0.6)] backdrop-blur">
        <span className="size-2 rounded-full" style={{ backgroundColor: state.phase === 'work' ? (subject?.color ?? '#AC9C8D') : '#D1C7BD' }} />
        <span className="max-w-[40vw] truncate text-sm">{state.phase === 'work' ? state.title : 'Pause'}</span>
        <span className="font-serif text-xl tabular">{formatClock(remainingMs(state, now))}</span>
        <button type="button" onClick={running ? pause : resume} className="min-h-10 rounded-full px-3 text-xs text-paper/80 hover:text-paper">
          {running ? 'Pause' : 'Fortsett'}
        </button>
        <Link to="/fokus" className="flex min-h-10 items-center rounded-full bg-paper px-4 text-xs text-ink">
          Åpne
        </Link>
      </div>
    </div>
  )
}
