/** Returns `next` only when it is a same-site absolute path; otherwise `/`. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/')) return '/';
  if (next.startsWith('//') || next.startsWith('/\\') || next.includes('\n') || next.includes('\r')) return '/';
  return next;
}
