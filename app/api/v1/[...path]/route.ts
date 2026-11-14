import { ApiError, apiCreateLink, apiListLibrary, apiListTracks, apiRecentSessions, apiTrackAnalytics } from '@/lib/api/service';
import { authenticateApiKey, countRequest, rateHeaders, type ApiCaller } from '@/lib/api-keys';
import { appOrigin } from '@/lib/origin';

export const maxDuration = 30;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
const fail = (status: number, code: string, message: string, headers: Record<string, string> = {}) => json({ error: { code, message } }, status, headers);

async function route(request: Request, path: string[], caller: ApiCaller): Promise<unknown> {
  const url = new URL(request.url);
  const [resource, id, sub] = path;
  if (request.method === 'GET') {
    if (resource === 'tracks' && !id) return apiListTracks(caller.workspaceId);
    if (resource === 'library' && !id) return apiListLibrary(caller.workspaceId, url.searchParams.get('q') ?? undefined);
    if (resource === 'tracks' && id && sub === 'analytics') return apiTrackAnalytics(caller.workspaceId, id);
    if (resource === 'sessions' && !id) {
      return apiRecentSessions(caller.workspaceId, { trackId: url.searchParams.get('track') ?? undefined, limit: Number(url.searchParams.get('limit')) || undefined });
    }
  }
  if (request.method === 'POST' && resource === 'tracks' && id && sub === 'links') {
    if (caller.scope !== 'write') throw new ApiError(403, 'read_only_key', 'This API key is read-only.');
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new ApiError(400, 'invalid_request', 'The request body must be JSON.');
    }
    return apiCreateLink(caller.workspaceId, caller.workspaceSlug, id, body ?? {}, await appOrigin());
  }
  throw new ApiError(404, 'not_found', 'No such endpoint.');
}

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const caller = await authenticateApiKey(request);
  if (!caller) return fail(401, 'unauthorized', 'Send a Pipemouse API key as a bearer token: Authorization: Bearer fello_sk_…');
  const rate = await countRequest(caller);
  const headers = rateHeaders(rate);
  if (!rate.allowed) return fail(429, 'rate_limited', `Rate limit reached. Try again in ${rate.reset} seconds.`, headers);
  try {
    return json({ data: await route(request, (await context.params).path, caller) }, request.method === 'POST' ? 201 : 200, headers);
  } catch (error) {
    if (error instanceof ApiError) return fail(error.status, error.code, error.message, headers);
    return fail(500, 'server_error', 'Something went wrong.', headers);
  }
}

export const GET = handle;
export const POST = handle;
