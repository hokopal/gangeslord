import { getRoomOptions, listSubmissions, submissionsCsv } from '@/lib/forms-server';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

/** A room's form submissions as a CSV download. Access rules limit it to the workspace's members. */
export async function GET(_request: Request, { params }: { params: Promise<{ workspace: string; track: string }> }) {
  const { workspace: slug, track: trackId } = await params;
  const context = await getWorkspaceContext(slug);
  const detail = context && /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(context.workspace.id, trackId) : null;
  const options = context && detail ? await getRoomOptions(context.workspace.id, detail.track.id) : null;
  if (!context || !detail || !options) return new Response('Not found', { status: 404 });
  const rows = await listSubmissions(context.workspace.id, detail.track.id, 5000);
  return new Response(submissionsCsv(rows, options.form.custom), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${detail.track.slug}-submissions.csv"`,
      'cache-control': 'no-store',
    },
  });
}
