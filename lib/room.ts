import { youTubeEmbedUrl } from './ingest/youtube';

export type RoomCta = { label: string; url: string };

export type RoomItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: 'web' | 'pdf' | 'youtube';
  renderMode: 'iframe' | 'snapshot' | 'file' | 'embed';
  /** What the content frame loads. Null when a stored file could not be linked. */
  src: string | null;
  thumbnailUrl: string | null;
};

export type Room = {
  workspace: { name: string; slug: string; logoUrl: string | null; brandColor: string | null };
  track: { id: string; name: string; slug: string; headerTitle: string; showNextButton: boolean; published: boolean };
  items: RoomItem[];
  headerCta: RoomCta | null;
  sidebarCta: RoomCta | null;
  itemCtas: Record<string, RoomCta>;
};

/** Shape returned by the public_room database function. */
export type RawRoom = {
  workspace: Room['workspace'];
  track: Room['track'];
  items: (Omit<RoomItem, 'src'> & { sourceUrl: string | null; videoId: string | null; hasFile: boolean })[];
  ctas: { placement: 'header' | 'sidebar' | 'item'; itemId: string | null; label: string; url: string }[];
};

/**
 * Turns the database's room into what the viewer renders. Stored files are addressed through
 * this app, which checks access on every request; the room never learns where they are kept.
 * Unused source links are dropped here so they never reach the visitor's browser.
 */
export function toRoom(raw: RawRoom): Room {
  const items = raw.items.map((item): RoomItem => {
    let src: string | null = null;
    if (item.renderMode === 'iframe') src = item.sourceUrl;
    else if (item.renderMode === 'snapshot') src = `/r/snapshot/${item.id}`;
    else if (item.renderMode === 'embed') src = item.videoId ? youTubeEmbedUrl(item.videoId) : null;
    else if (item.renderMode === 'file') src = item.hasFile ? `/r/file/${item.id}` : null;
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      description: item.description,
      type: item.type,
      renderMode: item.renderMode,
      src,
      thumbnailUrl: item.thumbnailUrl,
    };
  });
  const ids = new Set(items.map((i) => i.id));
  const find = (placement: 'header' | 'sidebar') => {
    const cta = raw.ctas.find((c) => c.placement === placement);
    return cta ? { label: cta.label, url: cta.url } : null;
  };
  const itemCtas: Record<string, RoomCta> = {};
  for (const cta of raw.ctas) {
    if (cta.placement === 'item' && cta.itemId && ids.has(cta.itemId)) {
      itemCtas[cta.itemId] = { label: cta.label, url: cta.url };
    }
  }
  return {
    workspace: raw.workspace,
    track: raw.track,
    items,
    headerCta: find('header'),
    sidebarCta: find('sidebar'),
    itemCtas,
  };
}

/** Which item a room URL opens: the one named by `slug`, otherwise the first. */
export function initialItem(room: Room, slug: string | undefined): RoomItem | null {
  return room.items.find((i) => i.slug === slug) ?? room.items[0] ?? null;
}

const KEEP_ALIVE = 3;

/**
 * Items whose frames stay mounted so switching back is instant: the current one, the last
 * few visited, and the next one preloaded. Videos are mounted only while current, so a
 * playing video stops when the visitor moves on.
 */
export function mountedIds(room: Room, currentId: string, visited: readonly string[]): string[] {
  const byId = new Map(room.items.map((i) => [i.id, i]));
  const keepable = (id: string) => byId.has(id) && byId.get(id)!.renderMode !== 'embed';
  const recent = [...visited].reverse().filter((id) => id !== currentId && keepable(id));
  const index = room.items.findIndex((i) => i.id === currentId);
  const next = room.items[index + 1];
  const ids = [currentId, ...recent.slice(0, KEEP_ALIVE - 1)];
  if (next && keepable(next.id) && !ids.includes(next.id)) ids.push(next.id);
  return ids.filter((id) => byId.has(id));
}
