import { toolsFor } from '@/lib/api/tools';
import { authenticateApiKey, countRequest, rateHeaders } from '@/lib/api-keys';
import { handleMcpBody } from '@/lib/mcp';
import { appOrigin } from '@/lib/origin';
import { planIncludesMcp } from '@/lib/plan-limits';

export const maxDuration = 30;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

/**
 * Pipemouse's MCP server: stateless Streamable HTTP. Each POST carries one JSON-RPC message
 * (or a batch) and gets a JSON reply. The caller is a workspace API key sent as a bearer token.
 */
export async function POST(request: Request) {
  const caller = await authenticateApiKey(request);
  if (!caller) {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Send a Pipemouse API key as a bearer token.' } }, 401, { 'www-authenticate': 'Bearer' });
  }
  if (!(await planIncludesMcp(caller.workspaceId))) {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32003, message: 'The MCP server is included in the Pro and Business plans. This workspace is on Starter.' } }, 403);
  }
  const rate = await countRequest(caller);
  const headers = rateHeaders(rate);
  if (!rate.allowed) {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32002, message: `Rate limit reached. Try again in ${rate.reset} seconds.` } }, 429, headers);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error.' } }, 400, headers);
  }
  const reply = await handleMcpBody(body, toolsFor(caller, await appOrigin()), { canWrite: caller.scope === 'write' });
  return reply === null ? new Response(null, { status: 202, headers }) : json(reply, 200, headers);
}

const notAllowed = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
// This server opens no streams and keeps no sessions.
export const GET = notAllowed;
export const DELETE = notAllowed;
