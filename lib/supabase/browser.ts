import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookieDomainFor } from '@/lib/site';
import { supabaseEnv } from './env';

export function createBrowserSupabase(): SupabaseClient {
  const { url, anonKey } = supabaseEnv();
  const domain = cookieDomainFor(window.location.hostname);
  return createBrowserClient(url, anonKey, domain ? { cookieOptions: { domain } } : undefined);
}
