const MIN_GAP = 1e-6;

/**
 * Position for an item dropped at `toIndex` among `others` (the ascending positions of
 * every other item). Fractional positions mean a move rewrites one row. Returns null when
 * the neighbours are too close to fit between, in which case the caller renumbers the list.
 */
export function positionAt(others: readonly number[], toIndex: number): number | null {
  if (others.length === 0) return 1;
  if (toIndex <= 0) return others[0] - 1;
  if (toIndex >= others.length) return others[others.length - 1] + 1;
  const before = others[toIndex - 1];
  const after = others[toIndex];
  if (after - before < MIN_GAP) return null;
  return (before + after) / 2;
}

/** `ids` with `id` moved to `toIndex` (clamped). */
export function moveId(ids: readonly string[], id: string, toIndex: number): string[] {
  const rest = ids.filter((x) => x !== id);
  const index = Math.max(0, Math.min(toIndex, rest.length));
  return [...rest.slice(0, index), id, ...rest.slice(index)];
}
