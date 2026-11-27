import { describe, expect, it } from 'vitest';
import { MAX_TEMPLATE_NAME, validateTemplateName } from './plan-templates-core';

describe('validateTemplateName', () => {
  it('trims and accepts a normal name', () => {
    expect(validateTemplateName('  Enterprise evaluation  ')).toBe('Enterprise evaluation');
  });
  it('rejects empty and whitespace-only names', () => {
    expect(validateTemplateName('')).toBeNull();
    expect(validateTemplateName('   ')).toBeNull();
  });
  it('rejects non-strings', () => {
    expect(validateTemplateName(null)).toBeNull();
    expect(validateTemplateName(42)).toBeNull();
  });
  it('accepts exactly the maximum length and rejects one more', () => {
    expect(validateTemplateName('a'.repeat(MAX_TEMPLATE_NAME))).toHaveLength(MAX_TEMPLATE_NAME);
    expect(validateTemplateName('a'.repeat(MAX_TEMPLATE_NAME + 1))).toBeNull();
  });
});
