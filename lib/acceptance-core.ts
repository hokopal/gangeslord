// Pure rules for accept & sign. Shared by the browser form, the API route and the unit tests,
// so the wording a buyer agrees to is one constant, not three drifting copies.

export const ACCEPTANCE_STATEMENT =
  'I accept the proposal shown in this room and confirm the details are correct. My typed name is my signature.';
export const MAX_STATEMENT = 500;
export const MAX_NAME = 120;
export const MAX_EMAIL = 254;

// A pragmatic address shape: something@single-label-or-more.tld with no spaces.
// The database re-checks with the same expression, so the two agree by construction.
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export type AcceptanceError = 'name_required' | 'email_invalid' | 'signature_required' | 'statement_invalid';
export type AcceptanceValue = { name: string; email: string; signature: string; statement: string };

export type AcceptanceResult = { ok: true; value: AcceptanceValue } | { ok: false; error: AcceptanceError };

/** Trims and validates what the buyer typed. Never throws: errors are codes the UI maps to copy. */
export function validateAcceptance(raw: { name?: unknown; email?: unknown; signature?: unknown; statement?: unknown }): AcceptanceResult {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const signature = typeof raw.signature === 'string' ? raw.signature.trim() : '';
  const statement = typeof raw.statement === 'string' ? raw.statement.trim() : '';
  if (name.length < 1 || name.length > MAX_NAME) return { ok: false, error: 'name_required' };
  if (email.length > MAX_EMAIL || !EMAIL_PATTERN.test(email)) return { ok: false, error: 'email_invalid' };
  if (signature.length < 1 || signature.length > MAX_NAME) return { ok: false, error: 'signature_required' };
  if (statement.length < 1 || statement.length > MAX_STATEMENT) return { ok: false, error: 'statement_invalid' };
  return { ok: true, value: { name, email, signature, statement } };
}
