import { NextResponse } from 'next/server';
import { tooManyRequests, withinLimit } from '@/lib/rate-limit';
import { isUuid, readJson, rememberVisitor, resolveVisit, type RoomVisit } from '@/lib/room-visit';

const fail = (code: string, status = 400) => NextResponse.json({ ok: false, error: code }, { status });

/** The visitor's plan for this room: the items, and who the visitor already is (to prefill the form). */
async function reply(visit: RoomVisit) {
  const { data } = await visit.supabase.rpc('room_action_items', { p_session: visit.session });
  const response = NextResponse.json({ ok: true, ...((data ?? { identified: false, name: null, email: null, items: [] }) as object) });
  rememberVisitor(response, visit);
  return response;
}

export async function GET(request: Request) {
  if (!(await withinLimit(request.headers, 'plan-read', 300, 60))) return tooManyRequests();
  const url = new URL(request.url);
  const visit = await resolveVisit(url.searchParams.get('workspace'), url.searchParams.get('track'));
  if (!visit) return fail('not_available');
  return reply(visit);
}

/** Tick or untick a plan item. Visitors can only affect the room their session belongs to. */
export async function POST(request: Request) {
  if (!(await withinLimit(request.headers, 'plan-write', 120, 600))) return tooManyRequests();
  const body = await readJson(request);
  const visit = body ? await resolveVisit(body.workspace, body.track) : null;
  if (!body || !visit) return fail(body ? 'not_available' : 'bad_request');
  if (!isUuid(body.id) || typeof body.done !== 'boolean') return fail('bad_request');
  const { data } = await visit.supabase.rpc('room_toggle_action', { p_session: visit.session, p_id: body.id, p_done: body.done });
  if (data !== true) return fail('not_accepted');
  return reply(visit);
}
