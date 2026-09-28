import { describe, expect, it } from 'vitest'
import { normalizeSupabaseUrl } from './env'

describe('normalizeSupabaseUrl', () => {
  it('fjerner /rest/v1/, mellomrom og skråstrek bak', () => {
    // Denne feilen skjedde både i .env og i Netlify: URL-en var kopiert med /rest/v1/ bak.
    expect(normalizeSupabaseUrl('https://abc.supabase.co/rest/v1/')).toBe('https://abc.supabase.co')
    expect(normalizeSupabaseUrl(' https://abc.supabase.co/ ')).toBe('https://abc.supabase.co')
    expect(normalizeSupabaseUrl('https://abc.supabase.co')).toBe('https://abc.supabase.co')
    expect(normalizeSupabaseUrl(undefined)).toBeUndefined()
  })
})
