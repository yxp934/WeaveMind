import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using the service role key.
 *
 * This should ONLY be used in secure server-side contexts (e.g. background workers)
 * and never imported into client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin client is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      // We do not need session persistence or token refresh in background jobs
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

