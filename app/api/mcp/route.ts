import { toolsFor } from '@/lib/api/tools';
import { authenticateApiKey, countRequests, rateHeaders } from '@/lib/api-keys';
import { handleMcpBody } from '@/lib/mcp';
import { siteOrigin } from '@/lib/origin';
import { planIncludesMcp } from '@/lib/plan-limits';

export const maxDuration = 30;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS, ...headers } });

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const rate = await countRequests(caller, 1);
    const headers = rateHeaders(rate);
    if (!rate.allowed) return json({ jsonrpc: '2.0', id: null, error: { code: -32002, message: `Rate limit reached. Try again in ${rate.reset} seconds.` } }, 429, headers);
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error.' } }, 400, headers);
  }
  // A batch is not one request: account for every message before executing any of them.
  const messageCount = Array.isArray(body) ? Math.min(Math.max(body.length, 1), 21) : 1;
  const rate = await countRequests(caller, messageCount);
  const headers = rateHeaders(rate);
  if (!rate.allowed) {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32002, message: `Rate limit reached. Try again in ${rate.reset} seconds.` } }, 429, headers);
  }
  const reply = await handleMcpBody(body, toolsFor(caller, await siteOrigin(caller.workspaceSlug)), { canWrite: caller.scope === 'write' });
  return reply === null ? new Response(null, { status: 202, headers: { ...CORS, ...headers } }) : json(reply, 200, headers);
}

const notAllowed = () => new Response(null, { status: 405, headers: { allow: 'POST, OPTIONS', ...CORS } });
// This server opens no streams and keeps no sessions.
export const GET = notAllowed;
export const DELETE = notAllowed;
export const OPTIONS = () => new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS', ...CORS } });
