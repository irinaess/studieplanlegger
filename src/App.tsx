import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { Header } from './components/Header'
import { FocusBar } from './focus/FocusBar'
import { FocusProvider } from './focus/FocusProvider'
import { useSession } from './hooks/useSession'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SetupNeededPage } from './pages/SetupNeededPage'

/**
 * Sidene utenom forsiden lastes først når du åpner dem ("code splitting").
 * Da blir første lasting raskere, særlig på iPad over mobilnett.
 */
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const TasksPage = lazy(() => import('./pages/TasksPage').then((m) => ({ default: m.TasksPage })))
const FocusPage = lazy(() => import('./pages/FocusPage').then((m) => ({ default: m.FocusPage })))
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })))
const ExamPage = lazy(() => import('./pages/ExamPage').then((m) => ({ default: m.ExamPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

/**
 * Appens "portvakt":
 *  1. Mangler .env? → oppsettside
 *  2. Ikke logget inn? → innlogging
 *  3. Ellers → sidene i appen
 */
export default function App() {
  const { session, loading } = useSession()

  if (!isSupabaseConfigured) return <SetupNeededPage />
  if (loading) return null
  if (!session) return <LoginPage />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="kalender" element={<CalendarPage />} />
          <Route path="oppgaver" element={<TasksPage />} />
          <Route path="fokus" element={<FocusPage />} />
          <Route path="statistikk" element={<StatsPage />} />
          <Route path="eksamen" element={<ExamPage />} />
          <Route path="innstillinger" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

/**
 * Rammen rundt alle sidene: bakgrunn, bredde, toppmeny og fokus-timeren.
 * <Outlet /> er der siden vises. FocusProvider ligger her, så timeren fortsetter når du bytter side.
 */
function Layout() {
  const queryClient = useQueryClient()

  async function signOut() {
    await supabase.auth.signOut()
    queryClient.clear() // glem dataene i minnet, så ingenting henger igjen etter utlogging
  }

  return (
    <FocusProvider>
      <div className="min-h-screen bg-linear-to-b from-paper via-paper to-[#f1ebe3]">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-8">
          <Header onSignOut={signOut} />
          <main className="mt-8">
            {/* Mens en side lastes, vises bare bakgrunnen (tar et øyeblikk første gang) */}
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        <FocusBar />
      </div>
    </FocusProvider>
  )
}
