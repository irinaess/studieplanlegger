/**
 * Rydder Supabase-URL-en fra miljøvariablene.
 *
 * Supabase viser URL-en med "/rest/v1/" bak på Data API-siden, men biblioteket
 * legger til den delen selv. Med den med to ganger feiler innloggingen, så vi
 * fjerner den (og mellomrom og skråstrek bak) hvis den er limt inn slik.
 */
export function normalizeSupabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
}
