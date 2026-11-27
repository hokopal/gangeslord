import { describe, expect, it } from 'vitest';
import { moveId, positionAt } from './ordering';
import { isActionOwner, MAX_LABEL, normalizeDueDate, planProgress, validateLabel } from './action-plan-core';

describe('validateLabel', () => {
  it('trims surrounding whitespace', () => {
    expect(validateLabel('  Send the DPA  ')).toBe('Send the DPA');
  });
  it('rejects empty and whitespace-only labels', () => {
    expect(validateLabel('')).toBeNull();
    expect(validateLabel('   ')).toBeNull();
  });
  it('rejects non-strings', () => {
    expect(validateLabel(null)).toBeNull();
    expect(validateLabel(42)).toBeNull();
    expect(validateLabel(undefined)).toBeNull();
  });
  it('accepts exactly the maximum length and rejects one more', () => {
    expect(validateLabel('a'.repeat(MAX_LABEL))).toHaveLength(MAX_LABEL);
    expect(validateLabel('a'.repeat(MAX_LABEL + 1))).toBeNull();
  });
});

describe('normalizeDueDate', () => {
  it('treats empty and missing as no due date', () => {
    expect(normalizeDueDate('')).toEqual({ ok: true, value: null });
    expect(normalizeDueDate('   ')).toEqual({ ok: true, value: null });
    expect(normalizeDueDate(null)).toEqual({ ok: true, value: null });
    expect(normalizeDueDate(undefined)).toEqual({ ok: true, value: null });
  });
  it('keeps real calendar dates', () => {
    expect(normalizeDueDate('2026-11-27')).toEqual({ ok: true, value: '2026-11-27' });
    expect(normalizeDueDate('2024-02-29')).toEqual({ ok: true, value: '2024-02-29' }); // leap day
  });
  it('rejects impossible dates instead of rolling them forward', () => {
    expect(normalizeDueDate('2026-02-29')).toEqual({ ok: false }); // not a leap year
    expect(normalizeDueDate('2026-13-01')).toEqual({ ok: false });
    expect(normalizeDueDate('2026-00-10')).toEqual({ ok: false });
    expect(normalizeDueDate('2026-04-31')).toEqual({ ok: false });
  });
  it('rejects anything not shaped like a date', () => {
    expect(normalizeDueDate('next Friday')).toEqual({ ok: false });
    expect(normalizeDueDate('27/11/2026')).toEqual({ ok: false });
    expect(normalizeDueDate('2026-1-7')).toEqual({ ok: false });
  });
});

describe('planProgress', () => {
  it('is zero percent for an empty plan', () => {
    expect(planProgress([])).toEqual({ total: 0, done: 0, percent: 0 });
  });
  it('counts done items and rounds the percentage', () => {
    expect(planProgress([{ done: true }, { done: false }, { done: false }])).toEqual({ total: 3, done: 1, percent: 33 });
    expect(planProgress([{ done: true }, { done: true }])).toEqual({ total: 2, done: 2, percent: 100 });
  });
});

describe('isActionOwner', () => {
  it('accepts seller and buyer only', () => {
    expect(isActionOwner('seller')).toBe(true);
    expect(isActionOwner('buyer')).toBe(true);
    expect(isActionOwner('admin')).toBe(false);
    expect(isActionOwner('')).toBe(false);
  });
});

describe('plan reordering integrates with the shared ordering helpers', () => {
  it('computes a position between the neighbours at the drop index', () => {
    const rest = [1, 2, 3]; // positions of a, b, c after lifting d out
    expect(positionAt(rest, 0)).toBe(0);
    expect(positionAt(rest, 1)).toBe(1.5);
    expect(positionAt(rest, 3)).toBe(4);
  });
  it('signals a renumber when the neighbours are closer than the minimum gap', () => {
    expect(positionAt([1, 1 + 1e-12], 1)).toBeNull();
  });
  it('moveId places the id at the clamped index', () => {
    expect(moveId(['a', 'b', 'c', 'd'], 'd', 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveId(['a', 'b'], 'a', 99)).toEqual(['b', 'a']);
  });
});
