import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { cookieDomainFor } from '@/lib/site';
import { supabaseEnv } from './env';

/** Supabase client bound to the current request's cookies. Row-level security applies. */
export async function createServerSupabase(): Promise<SupabaseClient> {
  const [store, h] = await Promise.all([cookies(), headers()]);
  const { url, anonKey } = supabaseEnv();
  const domain = cookieDomainFor(h.get('x-forwarded-host') ?? h.get('host') ?? '');
  return createServerClient(url, anonKey, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});
