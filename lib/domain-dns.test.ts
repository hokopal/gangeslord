import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeDomain, workspaceDnsRecord, workspaceIdentityFromTxt } from './domain-dns';

const originalSecret = process.env.SUPABASE_JWT_SECRET;
const ACME_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

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
    'os.pipemouse.com',
    'space.pipemouse.com',
    'rooms.pipemouse.com',
    'rooms.example..com',
    '-rooms.example.com',
  ])('rejects %s', (input) => {
    expect(() => normalizeDomain(input)).toThrow('invalid_domain');
  });
});

describe('workspace DNS proof', () => {
  it('round-trips a record for its exact domain and immutable workspace', () => {
    const record = workspaceDnsRecord('rooms.example.com', 'acme', ACME_ID);
    expect(record.name).toBe('_pipemouse.rooms.example.com');
    expect(workspaceIdentityFromTxt([[record.value]], 'rooms.example.com')).toEqual({ workspaceSlug: 'acme', workspaceId: ACME_ID });
  });

  it('rejects a proof copied to another domain', () => {
    const record = workspaceDnsRecord('rooms.example.com', 'acme', ACME_ID);
    expect(workspaceIdentityFromTxt([[record.value]], 'rooms.other-example.com')).toBeNull();
  });

  it('rejects forged, legacy and ambiguous records', () => {
    const acme = workspaceDnsRecord('rooms.example.com', 'acme', ACME_ID);
    const other = workspaceDnsRecord('rooms.example.com', 'other-workspace', OTHER_ID);
    expect(workspaceIdentityFromTxt([['pipemouse-workspace=acme;proof=forged']], 'rooms.example.com')).toBeNull();
    expect(workspaceIdentityFromTxt([[acme.value], [other.value]], 'rooms.example.com')).toBeNull();
  });

  it('does not treat a reused slug as the same workspace', () => {
    const old = workspaceDnsRecord('rooms.example.com', 'acme', ACME_ID);
    const reused = workspaceIdentityFromTxt([[old.value]], 'rooms.example.com');
    expect(reused?.workspaceId).toBe(ACME_ID);
    expect(reused?.workspaceId).not.toBe(OTHER_ID);
  });
});
