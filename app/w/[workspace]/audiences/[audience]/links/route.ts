import { linksCsv } from '@/lib/audience-core';
import { getAudience, linkRows } from '@/lib/audiences';
import { siteOrigin } from '@/lib/origin';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

export const maxDuration = 60;

const UUID = /^[0-9a-f-]{36}$/;

/** Downloads one audience's links to one track as a CSV file. Members of the workspace only. */
export async function GET(request: Request, { params }: { params: Promise<{ workspace: string; audience: string }> }) {
  const { workspace: slug, audience: audienceId } = await params;
  const trackId = new URL(request.url).searchParams.get('track') ?? '';
  const context = await getWorkspaceContext(slug);
  if (!context || !UUID.test(audienceId) || !UUID.test(trackId)) return new Response('Not found', { status: 404 });
  const [found, detail] = await Promise.all([getAudience(context.workspace.id, audienceId), getTrackDetail(context.workspace.id, trackId)]);
  if (!found || !detail) return new Response('Not found', { status: 404 });

  const rows = await linkRows(audienceId, trackId, await siteOrigin(context.workspace.slug), context.workspace.slug, detail.track.slug);
  return new Response(linksCsv(rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="fello-links-${detail.track.slug}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
}
