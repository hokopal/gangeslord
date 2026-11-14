export const PRODUCT_NAME = 'Pipemouse';

/**
 * The Pipemouse mark: a small mouse in a rounded square, its tail running off like a pipe.
 * It follows the text colour, so it sits correctly on light and dark surfaces.
 */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--text)" />
      <path d="M6 23.5h4.5a3 3 0 0 0 3-3" fill="none" stroke="var(--bg)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10.5 20.5c0-4.6 3.6-8 8-8 3.4 0 5.9 2 7.6 5.4.5 1-.1 2-1.2 2.2-2.6.5-5.6.6-8.4.6-2.4 0-4.5-.1-6-.2Z" fill="var(--bg)" />
      <circle cx="16.4" cy="11.6" r="3.4" fill="var(--bg)" />
      <circle cx="16.4" cy="11.6" r="1.4" fill="var(--text)" />
      <circle cx="21.6" cy="16.6" r="1.1" fill="var(--text)" />
    </svg>
  );
}

/** Logo and wordmark. `compact` is the small version used in the app sidebar. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? 'brand brand-compact' : 'brand'}>
      <Logo size={compact ? 16 : 22} />
      <span>{PRODUCT_NAME}</span>
    </p>
  );
}
