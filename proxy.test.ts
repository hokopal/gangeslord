import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveWorkspaceDomain, updateSession } = vi.hoisted(() => ({
  resolveWorkspaceDomain: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock('@/lib/workspace-domains', () => ({ resolveWorkspaceDomain }));
vi.mock('@/lib/supabase/proxy', () => ({ updateSession }));

import { proxy } from './proxy';

function request(path: string, host: string): NextRequest {
  return new NextRequest(`http://${host}${path}`, { headers: { host } });
}

beforeEach(() => {
  resolveWorkspaceDomain.mockReset();
  updateSession.mockReset();
  updateSession.mockImplementation(() => NextResponse.next());
});

describe('custom domain proxy', () => {
  it('rewrites a clean room path to the workspace bound to the host', async () => {
    resolveWorkspaceDomain.mockResolvedValue('acme');
    const response = await proxy(request('/proposal?r=token', 'rooms.example.com'));
    const rewrite = response.headers.get('x-middleware-rewrite');
    expect(rewrite).toBeTruthy();
    const url = new URL(rewrite!);
    expect(url.pathname).toBe('/r/acme/proposal');
    expect(url.search).toBe('?r=token');
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('blocks another workspace on a verified custom host', async () => {
    resolveWorkspaceDomain.mockResolvedValue('acme');
    const response = await proxy(request('/r/other-workspace/proposal', 'rooms.example.com'));
    expect(response.status).toBe(404);
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('canonicalizes the workspace-prefixed path on its custom host', async () => {
    resolveWorkspaceDomain.mockResolvedValue('acme');
    const response = await proxy(request('/r/acme/proposal?r=token', 'rooms.example.com'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://rooms.example.com/proposal?r=token');
  });

  it('sends app pages to the app origin and sign-in to the site origin', async () => {
    resolveWorkspaceDomain.mockResolvedValue('acme');
    const app = await proxy(request('/w/acme/settings', 'rooms.example.com'));
    const login = await proxy(request('/login', 'rooms.example.com'));
    expect(app.headers.get('location')).toBe('https://space.pipemouse.com/w/acme/settings');
    expect(login.headers.get('location')).toBe('https://www.pipemouse.com/login');
  });

  it('falls through to the existing session handler when the host has no verified binding', async () => {
    resolveWorkspaceDomain.mockResolvedValue(null);
    const response = await proxy(request('/proposal', 'rooms.example.com'));
    expect(updateSession).toHaveBeenCalledOnce();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('does not serve canonical rooms on an unbound custom host', async () => {
    resolveWorkspaceDomain.mockResolvedValue(null);
    const response = await proxy(request('/r/acme/proposal', 'rooms.example.com'));
    expect(response.status).toBe(404);
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('preserves the legacy Vercel-host redirect', async () => {
    const response = await proxy(request('/r/acme/proposal', 'salesroom-maininstancelai.vercel.app'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://www.pipemouse.com/r/acme/proposal');
    expect(resolveWorkspaceDomain).not.toHaveBeenCalled();
  });
});
