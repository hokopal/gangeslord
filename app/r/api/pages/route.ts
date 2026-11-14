import { NextResponse } from 'next/server';
import { readJson, rememberVisitor, resolveVisit } from '@/lib/room-visit';
import { tooManyRequests, withinLimit } from '@/lib/rate-limit';

/** The room reports how long a buyer spent on each page of a PDF. The database validates and caps it. */
export async function POST(request: Request) {
  if (!(await withinLimit(request.headers, 'pages', 240, 60))) return tooManyRequests();
  const body = await readJson(request);
  const visit = body ? await resolveVisit(body.workspace, body.track) : null;
  if (!body || !visit || typeof body.item !== 'string' || typeof body.pages !== 'object' || body.pages === null) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await visit.supabase.rpc('room_track_pages', { p_session: visit.session, p_item_slug: body.item.slice(0, 80), p_pages: body.pages });
  const response = new NextResponse(null, { status: 204 });
  rememberVisitor(response, visit);
  return response;
}
