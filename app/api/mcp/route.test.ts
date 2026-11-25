import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticateApiKey: vi.fn(),
  countRequests: vi.fn(),
  rateHeaders: vi.fn(),
  toolsFor: vi.fn(),
  handleMcpBody: vi.fn(),
  siteOrigin: vi.fn(),
  planIncludesMcp: vi.fn(),
}));

vi.mock('@/lib/api-keys', () => ({ authenticateApiKey: mocks.authenticateApiKey, countRequests: mocks.countRequests, rateHeaders: mocks.rateHeaders }));
vi.mock('@/lib/api/tools', () => ({ toolsFor: mocks.toolsFor }));
vi.mock('@/lib/mcp', () => ({ handleMcpBody: mocks.handleMcpBody }));
vi.mock('@/lib/origin', () => ({ siteOrigin: mocks.siteOrigin }));
vi.mock('@/lib/plan-limits', () => ({ planIncludesMcp: mocks.planIncludesMcp }));

import { POST } from './route';

const caller = { keyId: 'key', workspaceId: 'workspace', workspaceSlug: 'acme', scope: 'write' as const };
const allowed = { allowed: true, limit: 120, remaining: 119, reset: 60 };

function request(body: unknown): Request {
  return new Request('http://localhost/api/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.authenticateApiKey.mockResolvedValue(caller);
  mocks.planIncludesMcp.mockResolvedValue(true);
  mocks.countRequests.mockResolvedValue(allowed);
  mocks.rateHeaders.mockReturnValue({});
  mocks.toolsFor.mockReturnValue({});
  mocks.siteOrigin.mockResolvedValue('https://rooms.example.com');
  mocks.handleMcpBody.mockResolvedValue({ jsonrpc: '2.0', id: 1, result: { ok: true } });
});

describe('MCP batch rate accounting', () => {
  it('counts every message in a batch before handling it', async () => {
    const body = [
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      { jsonrpc: '2.0', id: 2, method: 'ping' },
      { jsonrpc: '2.0', id: 3, method: 'ping' },
    ];
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(mocks.countRequests).toHaveBeenCalledWith(caller, 3);
    expect(mocks.handleMcpBody).toHaveBeenCalledOnce();
  });

  it('does not execute a batch when its messages exceed the allowance', async () => {
    mocks.countRequests.mockResolvedValue({ ...allowed, allowed: false, remaining: 0, reset: 30 });
    const response = await POST(request([{ jsonrpc: '2.0', id: 1, method: 'tools/call' }, { jsonrpc: '2.0', id: 2, method: 'tools/call' }]));
    expect(response.status).toBe(429);
    expect(mocks.countRequests).toHaveBeenCalledWith(caller, 2);
    expect(mocks.handleMcpBody).not.toHaveBeenCalled();
  });
});
