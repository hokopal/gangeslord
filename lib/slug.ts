const MAX_LENGTH = 40;
const MIN_LENGTH = 3;
const FALLBACK = 'workspace';
const SUFFIX = '-ws';
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'login', 'auth', 'api', 'w', 'invite', 'onboarding', 'settings',
  'admin', 'www', 'app', 'rooms', 'static', 'assets', 'new',
]);

function trimTo(value: string, length: number): string {
  return value.slice(0, length).replace(/-+$/, '');
}

/** Turns any display name into a valid, non-reserved slug. */
export function slugify(input: string): string {
  let slug = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  slug = trimTo(slug, MAX_LENGTH);
  if (slug === '') return FALLBACK;
  if (slug.length < MIN_LENGTH || RESERVED_SLUGS.has(slug)) {
    slug = trimTo(slug, MAX_LENGTH - SUFFIX.length) + SUFFIX;
  }
  return slug;
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !slug.includes('--') && !RESERVED_SLUGS.has(slug);
}

/** Returns `base`, or `base-2`, `base-3`… for the first slug not in `taken`. */
export function nextAvailableSlug(
  base: string,
  taken: ReadonlySet<string>,
  maxLength: number = MAX_LENGTH,
): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = trimTo(base, maxLength - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
}

export const TITLE_SLUG_MAX = 80;
const TITLE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,78})[a-z0-9]$/;

/** Slug for a piece of content (asset, track item). Up to 80 characters, no reserved words. */
export function slugifyTitle(input: string, fallback = 'item'): string {
  const slug = trimTo(
    input
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
    TITLE_SLUG_MAX,
  );
  if (slug === '') return fallback;
  return slug.length < MIN_LENGTH ? `${slug}-${fallback}` : slug;
}

export function isValidTitleSlug(slug: string): boolean {
  return TITLE_SLUG_PATTERN.test(slug) && !slug.includes('--');
}
