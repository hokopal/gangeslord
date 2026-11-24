import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hasRoomFormProof, rememberRoomForm } from './room-visit';

const originalSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'room-form-test-secret';
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalSecret;
});

function issuedProof(): string {
  const response = NextResponse.json({ ok: true });
  rememberRoomForm(response, 'acme', 'proposal');
  const cookie = response.headers.get('set-cookie') ?? '';
  return decodeURIComponent(/^fello_fp=([^;]+)/.exec(cookie)?.[1] ?? '');
}

describe('room form proof', () => {
  it('accepts the server-issued proof for its exact room', () => {
    const proof = issuedProof();
    expect(proof).not.toBe('');
    expect(hasRoomFormProof(proof, 'acme', 'proposal')).toBe(true);
  });

  it('rejects the old forgeable value and proofs for another room', () => {
    const proof = issuedProof();
    expect(hasRoomFormProof('1', 'acme', 'proposal')).toBe(false);
    expect(hasRoomFormProof(proof, 'other', 'proposal')).toBe(false);
    expect(hasRoomFormProof(proof, 'acme', 'other')).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const proof = issuedProof();
    const tampered = `${proof.slice(0, -1)}${proof.endsWith('a') ? 'b' : 'a'}`;
    expect(hasRoomFormProof(tampered, 'acme', 'proposal')).toBe(false);
  });
});
