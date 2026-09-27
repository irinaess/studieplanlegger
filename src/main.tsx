import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/** Holder på data hentet fra Supabase, så sidene deler den og slipper å hente alt på nytt. */
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } }, // data regnes som ferske i 30 sekunder
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
