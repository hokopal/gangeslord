/**
 * Self-optimising tracks.
 *
 * From how past visitors consumed a track, this works out (1) the order new visitors should
 * see the items in and (2) for each item, what to suggest next. It is deliberately simple
 * enough to explain to the person who owns the track:
 *
 *   An item scores well when people who open it
 *     - stay long enough to count as engaged        (weight 0.5)
 *     - go on to open something else afterwards     (weight 0.3)
 *     - end up clicking one of the track's buttons  (weight 0.2)
 *
 * Three safeguards keep it honest on small numbers:
 *   - Rates are measured per open, not per visit, so an item is not rewarded just for being
 *     listed first and therefore seen most.
 *   - Every rate is pulled towards the track's average until an item has real evidence
 *     behind it, so one enthusiastic visitor cannot crown an item.
 *   - Items with few opens get a small exploration bonus, so new or buried content gets a
 *     fair hearing instead of being starved by the items that happened to start on top.
 */

export type Visit = { sessionId: string; itemId: string; engaged: boolean; firstAt: string };

export type ItemScore = {
  id: string;
  opens: number;
  /** Share of opens that became engaged, smoothed. */
  engagement: number;
  /** Share of opens after which the visitor opened another item, smoothed. */
  readOn: number;
  /** Share of engaged visits that clicked a button, smoothed. */
  conversion: number;
  /** 0 to 1. What the order is based on, before the exploration bonus. */
  score: number;
};

export type Optimization = {
  version: 1;
  /** Visits the result is based on. */
  sessions: number;
  /** False while there are too few visits to act on; the authored order is used until then. */
  ready: boolean;
  order: string[];
  /** For each item, the other items in the order they should be suggested after it. */
  next: Record<string, string[]>;
  items: ItemScore[];
};

/** Visits needed before the order is allowed to change. */
export const MIN_SESSIONS = 20;
const WEIGHTS = { engagement: 0.5, readOn: 0.3, conversion: 0.2 };
/** How many imaginary average visits each item starts with. */
const PRIOR = 5;
/** Size of the bonus for under-exposed items. Large enough to lift an untried item above a proven weak one, small enough that it never displaces a proven strong one. */
const EXPLORE = 0.1;
/** Evidence needed before "what people read after this" outweighs the overall ranking. */
const NEXT_PRIOR = 10;

const smooth = (hits: number, trials: number, mean: number) => (hits + PRIOR * mean) / (trials + PRIOR);
const ratio = (hits: number, trials: number, fallback: number) => (trials > 0 ? hits / trials : fallback);

export function optimizeTrack(input: {
  /** The track's items in the order its owner arranged them. */
  itemIds: readonly string[];
  visits: readonly Visit[];
  /** Sessions in which a button was clicked. */
  convertedSessions: readonly string[];
  pinFirst: boolean;
}): Optimization {
  const ids = [...input.itemIds];
  const known = new Set(ids);
  const converted = new Set(input.convertedSessions);

  // Each session's opens, in the order they happened. Items since removed from the track are ignored.
  const bySession = new Map<string, Visit[]>();
  for (const visit of input.visits) {
    if (!known.has(visit.itemId)) continue;
    const list = bySession.get(visit.sessionId);
    if (list) list.push(visit);
    else bySession.set(visit.sessionId, [visit]);
  }
  for (const list of bySession.values()) list.sort((a, b) => a.firstAt.localeCompare(b.firstAt));

  const zero = () => new Map(ids.map((id) => [id, 0]));
  const opens = zero();
  const engaged = zero();
  const readOn = zero();
  const engagedConverted = zero();
  // after.get(x).get(y): sessions that opened x and later engaged with y.
  const after = new Map(ids.map((id) => [id, zero()]));
  const openedLater = zero();
  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

  for (const [sessionId, list] of bySession) {
    list.forEach((visit, index) => {
      bump(opens, visit.itemId);
      if (visit.engaged) {
        bump(engaged, visit.itemId);
        if (converted.has(sessionId)) bump(engagedConverted, visit.itemId);
      }
      const later = list.slice(index + 1);
      if (later.length > 0) {
        bump(readOn, visit.itemId);
        bump(openedLater, visit.itemId);
        for (const next of later) if (next.engaged) bump(after.get(visit.itemId)!, next.itemId);
      }
    });
  }

  const total = (map: Map<string, number>) => [...map.values()].reduce((sum, value) => sum + value, 0);
  const means = {
    engagement: ratio(total(engaged), total(opens), 0.3),
    readOn: ratio(total(readOn), total(opens), 0.3),
    conversion: ratio(total(engagedConverted), total(engaged), 0.05),
  };

  const raw = ids.map((id) => ({
    id,
    opens: opens.get(id)!,
    engagement: smooth(engaged.get(id)!, opens.get(id)!, means.engagement),
    readOn: smooth(readOn.get(id)!, opens.get(id)!, means.readOn),
    conversion: smooth(engagedConverted.get(id)!, engaged.get(id)!, means.conversion),
  }));
  // Each measure is put on a 0 to 1 scale within the track, so a naturally small rate
  // (button clicks) still counts for its full weight.
  const top = {
    engagement: Math.max(...raw.map((r) => r.engagement), 1e-9),
    readOn: Math.max(...raw.map((r) => r.readOn), 1e-9),
    conversion: Math.max(...raw.map((r) => r.conversion), 1e-9),
  };
  const items: ItemScore[] = raw.map((r) => ({
    ...r,
    score:
      WEIGHTS.engagement * (r.engagement / top.engagement) +
      WEIGHTS.readOn * (r.readOn / top.readOn) +
      WEIGHTS.conversion * (r.conversion / top.conversion),
  }));

  const sessions = bySession.size;
  const ready = sessions >= MIN_SESSIONS && ids.length > 1;
  if (!ready) return { version: 1, sessions, ready: false, order: ids, next: {}, items };

  const position = new Map(ids.map((id, index) => [id, index]));
  const rank = new Map(items.map((item) => [item.id, item.score + EXPLORE * Math.sqrt(Math.log(sessions + 1) / (item.opens + 1))]));
  // Ties keep the owner's order, so the result is stable from one run to the next.
  const byRank = (a: string, b: string) => rank.get(b)! - rank.get(a)! || position.get(a)! - position.get(b)!;

  const order = input.pinFirst ? [ids[0], ...ids.slice(1).sort(byRank)] : [...ids].sort(byRank);

  const topRank = Math.max(...rank.values(), 1e-9);
  const next: Record<string, string[]> = {};
  for (const id of ids) {
    const evidence = openedLater.get(id)!;
    const trust = evidence / (evidence + NEXT_PRIOR);
    const affinity = (other: string) => trust * ratio(after.get(id)!.get(other)!, evidence, 0) + (1 - trust) * (rank.get(other)! / topRank);
    next[id] = ids
      .filter((other) => other !== id)
      .sort((a, b) => affinity(b) - affinity(a) || order.indexOf(a) - order.indexOf(b));
  }
  return { version: 1, sessions, ready: true, order, next, items };
}

/**
 * What to offer a visitor next. With suggestions, it is the best-suited item they have not
 * opened yet; without them (a fixed track, or one still learning), it is simply the item
 * that follows in the list.
 */
export function pickNext<T extends { id: string }>(items: readonly T[], currentId: string, visited: readonly string[], suggestions?: Record<string, string[]>): T | undefined {
  const index = items.findIndex((item) => item.id === currentId);
  const ranked = suggestions?.[currentId];
  if (!ranked) return items[index + 1];
  const seen = new Set([...visited, currentId]);
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const id of ranked) {
    const candidate = byId.get(id);
    if (candidate && !seen.has(id)) return candidate;
  }
  // Suggestions can lag behind a track that has just gained an item: fall back to anything unopened.
  return items.find((item) => !seen.has(item.id));
}

/** Arranges items by a stored order. Items the order doesn't know about (added since) go last, in their own order. */
export function applyOrder<T extends { id: string }>(items: readonly T[], order: readonly string[] | undefined): T[] {
  if (!order || order.length === 0) return [...items];
  const place = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => (place.get(a.id) ?? Infinity) - (place.get(b.id) ?? Infinity));
}
