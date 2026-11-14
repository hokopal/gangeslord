import { createHash } from 'node:crypto';
import { createAdminSupabase, serverSecret } from './supabase/admin';

// One limiter for every public endpoint. Counting happens in the database, through a function
// only the server may call, so a visitor cannot reset, read or bypass their own count.

/** The caller's network address as the platform reports it. */
function addressOf(headers: Headers): string {
  return (headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
}

/**
 * Counts one request and says whether the caller is still within `limit` per `seconds`.
 * Callers are told apart by `who` when given (a visitor cookie), otherwise by network address.
 * Each kind of action has its own `bucket`, so reading a document does not use up form attempts.
 * If the counter itself cannot be reached the request is allowed: a broken limiter must not take
 * every room offline.
 */
export async function withinLimit(headers: Headers, bucket: string, limit: number, seconds: number, who?: string): Promise<boolean> {
  const key = createHash('sha256').update(`${serverSecret()}:${bucket}:${who || `ip:${addressOf(headers)}`}`).digest('hex');
  try {
    const { data, error } = await createAdminSupabase().rpc('room_rate_hit', { p_key: key, p_limit: limit, p_seconds: seconds });
    return error ? true : data === true;
  } catch {
    return true;
  }
}

export const tooManyRequests = () => new Response(JSON.stringify({ ok: false, error: 'too_many_requests' }), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '60' } });
