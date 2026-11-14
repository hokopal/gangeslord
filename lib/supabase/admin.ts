import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** The server-only Supabase secret. Never sent to a browser: it has no NEXT_PUBLIC_ prefix. */
export function serverSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('ai_secret_missing');
  return secret;
}

/**
 * A client that bypasses row-level security. Use it only for data no signed-in user may
 * touch directly, and only after checking the caller's role in application code.
 */
export function createAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('ai_secret_missing');
  return createClient(url, serverSecret(), { auth: { persistSession: false, autoRefreshToken: false } });
}
