// Pure rules for reusable mutual-action-plan templates. Kept separate from the
// database so they can be unit-tested without a connection.

export const MAX_TEMPLATE_NAME = 120;

/** Trims and validates a template name; null when it is missing or too long. */
export function validateTemplateName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (name.length === 0 || name.length > MAX_TEMPLATE_NAME) return null;
  return name;
}
