import { NextResponse } from 'next/server';
import { withinLimit } from '@/lib/rate-limit';
import { readRoomSnapshot } from '@/lib/room-server';
import { isUuid, readVisitor } from '@/lib/room-visit';
import { snapshotResponse } from '@/lib/snapshot-response';

export async function GET(request: Request, { params }: { params: Promise<{ item: string }> }) {
  const { item } = await params;
  const visitor = await readVisitor();
  if (!(await withinLimit(request.headers, 'files', 600, 60, visitor))) return new NextResponse('Too many requests', { status: 429, headers: { 'retry-after': '60' } });
  // Served only while the room is published, its workspace is active, and any on-arrival form is filled in;
  // or to a member previewing a draft.
  return snapshotResponse(isUuid(item) ? await readRoomSnapshot(item, visitor) : null);
}
