import { NextResponse } from 'next/server';
import { readJson, rememberVisitor, resolveVisit } from '@/lib/room-visit';
import { tooManyRequests, withinLimit } from '@/lib/rate-limit';

/** The room reports how much of a video a buyer watched. The database clamps it and keeps the highest. */
export async function POST(request: Request) {
  if (!(await withinLimit(request.headers, 'video', 240, 60))) return tooManyRequests();
  const body = await readJson(request);
  const visit = body ? await resolveVisit(body.workspace, body.track) : null;
  if (!body || !visit || typeof body.item !== 'string' || !Number.isInteger(body.percent) || !Number.isInteger(body.furthest)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await visit.supabase.rpc('room_track_video', { p_session: visit.session, p_item_slug: body.item.slice(0, 80), p_percent: body.percent, p_furthest: body.furthest });
  const response = new NextResponse(null, { status: 204 });
  rememberVisitor(response, visit);
  return response;
}
