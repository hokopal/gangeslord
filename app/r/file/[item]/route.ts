import { NextResponse } from 'next/server';
import { withinLimit } from '@/lib/rate-limit';
import { roomFileLink } from '@/lib/room-server';
import { isUuid, readVisitor } from '@/lib/room-visit';

/**
 * A room's PDF. Each request is checked afresh (published, not suspended, form filled in) and then
 * sent on to a link that lasts a minute, so access ends as soon as any of those change.
 */
export async function GET(request: Request, { params }: { params: Promise<{ item: string }> }) {
  const { item } = await params;
  const visitor = await readVisitor();
  if (!(await withinLimit(request.headers, 'files', 600, 60, visitor))) return new NextResponse('Too many requests', { status: 429, headers: { 'retry-after': '60' } });
  const link = isUuid(item) ? await roomFileLink(item, visitor) : null;
  if (!link) return new NextResponse('Not found', { status: 404 });
  return NextResponse.redirect(link, { status: 302, headers: { 'cache-control': 'no-store' } });
}
