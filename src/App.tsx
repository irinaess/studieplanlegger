import { useQueryClient } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { Header } from './components/Header'
import { useSession } from './hooks/useSession'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { CalendarPage } from './pages/CalendarPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
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
          <Route path="statistikk" element={<ComingSoonPage title="Statistikk" step={7} />} />
          <Route path="eksamen" element={<ComingSoonPage title="Eksamen" step={8} />} />
          <Route path="innstillinger" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

/** Rammen rundt alle sidene: bakgrunn, bredde og toppmeny. <Outlet /> er der siden vises. */
function Layout() {
  const queryClient = useQueryClient()

  async function signOut() {
    await supabase.auth.signOut()
    queryClient.clear() // glem dataene i minnet, så ingenting henger igjen etter utlogging
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-paper via-paper to-[#f1ebe3]">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-8">
        <Header onSignOut={signOut} />
        <main className="mt-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
