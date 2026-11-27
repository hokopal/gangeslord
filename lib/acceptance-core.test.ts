import { describe, expect, it } from 'vitest';
import { ACCEPTANCE_STATEMENT, MAX_STATEMENT, validateAcceptance } from './acceptance-core';

const valid = { name: 'Dana Buyer', email: 'Dana@Buyer.Example', signature: 'Dana Q. Buyer', statement: ACCEPTANCE_STATEMENT };

describe('validateAcceptance', () => {
  it('accepts a valid submission and normalises it', () => {
    const result = validateAcceptance(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('dana@buyer.example'); // lower-cased
      expect(result.value.name).toBe('Dana Buyer');
    }
  });

  it('rejects missing or oversized names', () => {
    expect(validateAcceptance({ ...valid, name: '' })).toEqual({ ok: false, error: 'name_required' });
    expect(validateAcceptance({ ...valid, name: '   ' })).toEqual({ ok: false, error: 'name_required' });
    expect(validateAcceptance({ ...valid, name: 'x'.repeat(121) })).toEqual({ ok: false, error: 'name_required' });
    expect(validateAcceptance({ ...valid, name: 42 })).toEqual({ ok: false, error: 'name_required' });
  });

  it('rejects malformed email addresses', () => {
    for (const email of ['nope', 'a@b', 'a b@c.com', '@x.com', 'a@.com', 'a@b.c']) {
      expect(validateAcceptance({ ...valid, email })).toEqual({ ok: false, error: 'email_invalid' });
    }
  });

  it('rejects missing signatures', () => {
    expect(validateAcceptance({ ...valid, signature: '' })).toEqual({ ok: false, error: 'signature_required' });
    expect(validateAcceptance({ ...valid, signature: 'x'.repeat(121) })).toEqual({ ok: false, error: 'signature_required' });
  });

  it('rejects empty statements and statements over the cap', () => {
    expect(validateAcceptance({ ...valid, statement: '' })).toEqual({ ok: false, error: 'statement_invalid' });
    expect(validateAcceptance({ ...valid, statement: 'x'.repeat(MAX_STATEMENT + 1) })).toEqual({ ok: false, error: 'statement_invalid' });
  });
});
