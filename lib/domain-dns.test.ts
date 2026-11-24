import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeDomain, workspaceDnsRecord, workspaceSlugFromTxt } from './domain-dns';

const originalSecret = process.env.SUPABASE_JWT_SECRET;

beforeEach(() => {
  process.env.SUPABASE_JWT_SECRET = 'domain-test-secret';
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.SUPABASE_JWT_SECRET;
  else process.env.SUPABASE_JWT_SECRET = originalSecret;
});

describe('normalizeDomain', () => {
  it('canonicalizes case, trailing dots and international hostnames', () => {
    expect(normalizeDomain('Rooms.Example.COM.')).toBe('rooms.example.com');
    expect(normalizeDomain('bücher.example')).toBe('xn--bcher-kva.example');
  });

  it.each([
    '',
    'https://rooms.example.com',
    'rooms.example.com/path',
    'rooms.example.com:443',
    'localhost',
    '127.0.0.1',
    'rooms.vercel.app',
    'space.pipemouse.com',
    'rooms.example..com',
    '-rooms.example.com',
  ])('rejects %s', (input) => {
    expect(() => normalizeDomain(input)).toThrow('invalid_domain');
  });
});

describe('workspace DNS proof', () => {
  it('round-trips a record for its exact domain and workspace', () => {
    const record = workspaceDnsRecord('rooms.example.com', 'acme');
    expect(record.name).toBe('_pipemouse.rooms.example.com');
    expect(workspaceSlugFromTxt([[record.value]], 'rooms.example.com')).toBe('acme');
  });

  it('rejects a proof copied to another domain', () => {
    const record = workspaceDnsRecord('rooms.example.com', 'acme');
    expect(workspaceSlugFromTxt([[record.value]], 'rooms.other-example.com')).toBeNull();
  });

  it('rejects forged and ambiguous records', () => {
    const acme = workspaceDnsRecord('rooms.example.com', 'acme');
    const other = workspaceDnsRecord('rooms.example.com', 'other-workspace');
    expect(workspaceSlugFromTxt([['pipemouse-workspace=acme;proof=forged']], 'rooms.example.com')).toBeNull();
    expect(workspaceSlugFromTxt([[acme.value], [other.value]], 'rooms.example.com')).toBeNull();
  });
});
