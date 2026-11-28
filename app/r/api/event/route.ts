import { after } from 'next/server';
import { alertFor } from '@/lib/alerts';
import { syncHubspotActivity } from '@/lib/hubspot-activity';
import { syncOsActivity } from '@/lib/os-activity';
import { recomputeForSession } from '@/lib/optimize-server';
import { appOrigin } from '@/lib/origin';
import { createServerSupabase } from '@/lib/supabase/server';
import { tooManyRequests, withinLimit } from '@/lib/rate-limit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TYPES = new Set(['heartbeat', 'item_view', 'cta_click']);

/** Records one signal from a room. The database decides whether it counts. */
export async function POST(request: Request) {
  if (!(await withinLimit(request.headers, 'event', 900, 60))) return tooManyRequests();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await request.text()) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  const { session, item, type, meta } = body;
  if (typeof session !== 'string' || !UUID.test(session) || typeof type !== 'string' || !TYPES.has(type)) {
    return new Response(null, { status: 400 });
  }
  if (item != null && (typeof item !== 'string' || !UUID.test(item))) return new Response(null, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: outcome } = await supabase.rpc('room_track', {
    p_session: session,
    p_item: (item as string | null) ?? null,
    p_type: type,
    p_value: null,
    p_meta: typeof meta === 'string' ? meta.slice(0, 200) : null,
  });
  // Alerts and CRM logging go out after the reply, so they never slow the room down.
  // Plain heartbeats trigger nothing; opening an item, crossing a threshold or clicking a button does.
  if (outcome === 'threshold' || (outcome === 'ok' && type !== 'heartbeat')) {
    const origin = await appOrigin();
    after(async () => {
      if (outcome === 'threshold') await alertFor(session, 'binge', origin);
      if (type === 'cta_click') await alertFor(session, 'cta_click', origin, { button: typeof meta === 'string' ? meta : undefined });
      await Promise.all([syncHubspotActivity(session, origin), syncOsActivity(session, origin)]);
      // New engagement is new evidence: let a self-optimising track learn from it.
      if (outcome === 'threshold') await recomputeForSession(session);
    });
  }
  return new Response(null, { status: 204 });
}
