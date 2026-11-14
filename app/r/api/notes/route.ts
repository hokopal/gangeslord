import { after, NextResponse } from 'next/server';
import { alertFor } from '@/lib/alerts';
import { appOrigin } from '@/lib/origin';
import { tooManyRequests, withinLimit } from '@/lib/rate-limit';
import { isUuid, readJson, rememberVisitor, resolveVisit, type RoomVisit } from '@/lib/room-visit';
import { createAdminSupabase } from '@/lib/supabase/admin';

const fail = (code: string, status = 400) => NextResponse.json({ ok: false, error: code }, { status });
const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Replies with the guest's own comments in this room. A guest can never be sent anyone else's. */
async function reply(visit: RoomVisit) {
  const { data } = await visit.supabase.rpc('room_my_notes', { p_session: visit.session });
  const response = NextResponse.json({ ok: true, ...((data ?? { identified: false, name: null, notes: [] }) as object) });
  rememberVisitor(response, visit);
  return response;
}

export async function GET(request: Request) {
  if (!(await withinLimit(request.headers, 'notes-read', 300, 60))) return tooManyRequests();
  const url = new URL(request.url);
  const visit = await resolveVisit(url.searchParams.get('workspace'), url.searchParams.get('track'));
  if (!visit) return fail('not_available');
  // With `marks`, the guest's drawings and pinned notes on one item; otherwise their comments.
  const item = url.searchParams.get('marks');
  if (!item) return reply(visit);
  const { data } = await visit.supabase.rpc('room_my_marks', { p_session: visit.session, p_item_slug: item.slice(0, 80) });
  const response = NextResponse.json({ ok: true, ...((data ?? { identified: false, marks: [] }) as object) });
  rememberVisitor(response, visit);
  return response;
}

/** Adds a comment, question, sticky note or drawing. A guest who is not yet identified sends their name and email with it. */
export async function POST(request: Request) {
  // Writing is limited per network address: 60 notes or marks in ten minutes is plenty for a person.
  if (!(await withinLimit(request.headers, 'notes-write', 60, 600))) return tooManyRequests();
  const body = await readJson(request);
  const visit = body ? await resolveVisit(body.workspace, body.track) : null;
  if (!body || !visit) return fail(body ? 'not_available' : 'bad_request');
  const name = str(body.name, 120);
  const email = str(body.email, 254);
  if (name || email) {
    // Only the server may call the functions that store what a visitor writes.
    const { data: identified } = await createAdminSupabase().rpc('room_identify', { p_session: visit.session, p_name: name, p_email: email });
    if (!identified) return fail('identity_invalid');
  }
  const { data: id } = await createAdminSupabase().rpc('room_add_note', {
    p_session: visit.session, p_item: isUuid(body.item) ? body.item : null, p_kind: str(body.kind, 20), p_body: str(body.body, 2000),
    // A drawing or a pinned note also says which page it is on and where.
    p_page: Number.isInteger(body.page) ? body.page : null,
    p_mark: typeof body.mark === 'object' && body.mark !== null ? body.mark : null,
    p_item_slug: str(body.item_slug, 80) || null,
  });
  if (!id) return fail('not_accepted');
  // Tell the workspace's alert channels that something was left. Drawings and private notes stay quiet.
  if (body.kind === 'comment' || body.kind === 'question') {
    const origin = await appOrigin();
    after(() => alertFor(visit.session, 'comment', origin));
  }
  return reply(visit);
}

export async function DELETE(request: Request) {
  if (!(await withinLimit(request.headers, 'notes-write', 60, 600))) return tooManyRequests();
  const body = await readJson(request);
  const visit = body ? await resolveVisit(body.workspace, body.track) : null;
  if (!body || !visit || !isUuid(body.note)) return fail('bad_request');
  await visit.supabase.rpc('room_delete_note', { p_session: visit.session, p_note: body.note });
  return reply(visit);
}
