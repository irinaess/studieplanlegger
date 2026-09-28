/**
 * Tilkoblingen til Supabase.
 *
 * URL og nøkkel leses fra .env. Den publiserbare nøkkelen er laget for å ligge
 * i nettleseren. Det er Row Level Security i databasen som beskytter dataene.
 */
import { createClient } from '@supabase/supabase-js'
import { normalizeSupabaseUrl } from './env'

const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

/** Er .env fylt ut? Hvis ikke viser appen en oppsettside i stedet for å krasje. */
export const isSupabaseConfigured = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost', key || 'mangler-nokkel')
