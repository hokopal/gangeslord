import { describe, expect, it } from 'vitest';
import { errorMessage } from './messages';

describe('errorMessage', () => {
  it('returns the configured message for a known code', () => {
    expect(errorMessage('not_allowed')).toBe('You don’t have permission to do that.');
  });

  it.each(['__proto__', 'constructor', 'toString', 'unknown'])('uses the fallback for inherited or unknown code %s', (code) => {
    expect(errorMessage(code)).toBe('Something went wrong. Please try again.');
  });
});
