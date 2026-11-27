// Pure rules for the mutual action plan. No I/O, so every edge case is unit-testable.

export const ACTION_OWNERS = ['seller', 'buyer'] as const;
export type ActionOwner = (typeof ACTION_OWNERS)[number];
export type PlanItem = {
  id: string;
  position: number;
  label: string;
  owner: ActionOwner;
  dueDate: string | null;
  done: boolean;
  doneAt: string | null;
  doneBy: ActionOwner | null;
};

export const MAX_LABEL = 300;

export const isActionOwner = (value: unknown): value is ActionOwner =>
  typeof value === 'string' && (ACTION_OWNERS as readonly string[]).includes(value);

/** The label as it will be stored, or null when it is unusable. */
export function validateLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const label = raw.trim();
  return label.length >= 1 && label.length <= MAX_LABEL ? label : null;
}

export type DueDate = { ok: true; value: string | null } | { ok: false };

/**
 * Normalises a date input to YYYY-MM-DD. Empty (or missing) means no due date;
 * anything that is not a real calendar date is rejected so the buyer never sees "13th of Smarch".
 */
export function normalizeDueDate(raw: unknown): DueDate {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const text = String(raw).trim();
  if (text === '') return { ok: true, value: null };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return { ok: false };
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { ok: false };
  return { ok: true, value: `${match[1]}-${match[2]}-${match[3]}` };
}

export type PlanProgress = { total: number; done: number; percent: number };

/** How far along the plan is, for the panel and the seller page. An empty plan is 0%. */
export function planProgress(items: readonly { done: boolean }[]): PlanProgress {
  const total = items.length;
  const done = items.reduce((count, item) => count + (item.done ? 1 : 0), 0);
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
