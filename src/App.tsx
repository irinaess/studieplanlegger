import { useQueryClient } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { Header } from './components/Header'
import { FocusBar } from './focus/FocusBar'
import { FocusProvider } from './focus/FocusProvider'
import { useSession } from './hooks/useSession'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { CalendarPage } from './pages/CalendarPage'
import { ExamPage } from './pages/ExamPage'
import { FocusPage } from './pages/FocusPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { SetupNeededPage } from './pages/SetupNeededPage'
import { TasksPage } from './pages/TasksPage'

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
            <Outlet />
          </main>
        </div>
        <FocusBar />
      </div>
    </FocusProvider>
  )
}
