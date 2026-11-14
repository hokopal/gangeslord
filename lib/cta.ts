export type CtaInput = { label: string; url: string } | null;

/**
 * Cleans a button's label and link. Both empty means "no button" (null). A bare domain
 * gets https://. Only http, https and mailto links are allowed, so a button can never
 * run script. Throws cta_label_required, cta_url_required or cta_url_invalid.
 */
export function normalizeCta(rawLabel: string, rawUrl: string): CtaInput {
  const label = rawLabel.trim();
  let url = rawUrl.trim();
  if (label === '' && url === '') return null;
  if (label === '') throw new Error('cta_label_required');
  if (url === '') throw new Error('cta_url_required');
  if (label.length > 60) throw new Error('cta_label_required');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('cta_url_invalid');
  }
  if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) throw new Error('cta_url_invalid');
  if (parsed.protocol !== 'mailto:' && !parsed.hostname.includes('.')) throw new Error('cta_url_invalid');
  return { label, url: parsed.toString() };
}
