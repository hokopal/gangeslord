'use client';

import { ArrowRight, Check, ChevronLeft, ChevronRight, FileText, Globe, Menu, SquarePlay } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { pickNext } from '@/lib/optimize';
import { mountedIds, type Room, type RoomCta, type RoomItem } from '@/lib/room';
import { DEFAULT_DISPLAY, shouldGate, type Display, type PublicForm } from '@/lib/room-options';
import { PdfViewer } from './PdfViewer';
import { RoomGate } from './RoomGate';
import { RoomShare } from './RoomShare';
import { useRoomTracking } from './useRoomTracking';
import { VideoFrame } from './VideoFrame';

function ItemIcon({ type }: { type: RoomItem['type'] }) {
  if (type === 'pdf') return <FileText aria-hidden="true" />;
  if (type === 'youtube') return <SquarePlay aria-hidden="true" />;
  return <Globe aria-hidden="true" />;
}

const TYPE_LABEL: Record<string, string> = { pdf: 'PDF', youtube: 'Video' };

function Frame({ item, room }: { item: RoomItem; room: Room }) {
  if (!item.src) {
    return (
      <div className="preview-message">
        <div>
          <h2>This item isn’t available right now</h2>
          <p>Try another item from the list, or come back later.</p>
        </div>
      </div>
    );
  }
  // Reading and watching time is reported only for published rooms; a draft preview is not a buyer's visit.
  const report = room.track.published ? { workspace: room.workspace.slug, track: room.track.slug, item: item.slug } : undefined;
  if (item.renderMode === 'embed') return <VideoFrame src={item.src} title={item.title} report={report} />;
  if (item.renderMode === 'snapshot') {
    return <iframe title={item.title} src={item.src} sandbox="allow-popups allow-popups-to-escape-sandbox" />;
  }
  if (item.renderMode === 'file') return <PdfViewer src={item.src} title={item.title} report={report} />;
  return (
    <iframe
      title={item.title}
      src={item.src}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

function CtaLink({ cta, className, onPress }: { cta: RoomCta; className: string; onPress: () => void }) {
  return (
    <a className={className} href={cta.url} target="_blank" rel="noopener noreferrer" onClick={onPress}>
      {cta.label}
    </a>
  );
}

export type RoomFooter = { text: string; url: string | null; showFello: boolean };

/**
 * The buyer-facing room: every item in a sidebar, one content pane. Switching items swaps
 * panes and updates the address without a page load; visited frames stay mounted and the
 * next one is preloaded, so moving between items is immediate.
 */
export function RoomViewer({
  room,
  initialId,
  basePath,
  footer,
  suggestions,
  display = DEFAULT_DISPLAY,
  form,
  formDone = false,
  known = false,
  shareUrl,
}: {
  room: Room;
  initialId: string;
  basePath: string;
  footer?: RoomFooter;
  /** For a self-optimising track: per item, the other items in the order they should be suggested next. */
  suggestions?: Record<string, string[]>;
  display?: Display;
  /** The track's lead form, when it has one. */
  form?: PublicForm | null;
  /** The visitor has already filled the form in. */
  formDone?: boolean;
  /** The visitor arrived on a personal link, so the form is not needed. */
  known?: boolean;
  /** The room's public address, for the share buttons. */
  shareUrl?: string;
}) {
  const [currentId, setCurrentId] = useState(initialId);
  const [visited, setVisited] = useState<string[]>([initialId]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(formDone);
  const [seconds, setSeconds] = useState(0);

  const index = room.items.findIndex((i) => i.id === currentId);
  const current = room.items[index] ?? room.items[0];
  const previous = room.items[index - 1];
  const following = room.items[index + 1];
  const next = pickNext(room.items, current.id, visited, suggestions);
  const mounted = useMemo(() => mountedIds(room, current.id, visited), [room, current.id, visited]);
  const trackClick = useRoomTracking(room, current.id);
  const gated = shouldGate(form, { unlocked, known, opened: visited.length, seconds });

  const show = useCallback((id: string) => {
    setCurrentId(id);
    setVisited((list) => [...list.filter((x) => x !== id), id]);
    setDrawerOpen(false);
  }, []);

  const open = useCallback(
    (item: RoomItem) => {
      if (item.id === currentId) return setDrawerOpen(false);
      window.history.pushState({ item: item.id }, '', `${basePath}/${item.slug}`);
      show(item.id);
    },
    [basePath, currentId, show],
  );

  // Back and forward move between items instead of leaving the room.
  useEffect(() => {
    const onPop = () => {
      const slug = window.location.pathname.slice(basePath.length).split('/').filter(Boolean)[0];
      const target = room.items.find((i) => i.slug === slug) ?? room.items[0];
      show(target.id);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [basePath, room.items, show]);

  // Left and right arrow keys step through the items, unless the visitor is typing or the form is up.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (gated || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.key === 'ArrowRight' && following) open(following);
      if (event.key === 'ArrowLeft' && previous) open(previous);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [following, gated, open, previous]);

  // For a form that appears after some time in the room: count that time, only while it matters.
  const timed = form?.when === 'time' && !unlocked && !known;
  useEffect(() => {
    if (!timed) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timed]);

  useEffect(() => {
    document.title = `${current.title} · ${room.track.name}`;
  }, [current.title, room.track.name]);

  const itemCta = room.itemCtas[current.id];
  const primaryCta = room.headerCta ?? room.sidebarCta;
  const accent = room.workspace.brandColor ? ({ '--accent': room.workspace.brandColor } as React.CSSProperties) : undefined;
  const total = room.items.length;
  const roomTitle = room.track.headerTitle || room.track.name;

  return (
    <div className="room" style={accent} data-gated={gated}>
      <div className="room-scrim" data-open={drawerOpen} onClick={() => setDrawerOpen(false)} />
      <aside className="room-sidebar" data-open={drawerOpen}>
        <div className="room-brand">
          {room.workspace.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- workspace-supplied logo of unknown size
            <img src={room.workspace.logoUrl} alt={room.workspace.name} />
          ) : (
            <>
              <span className="room-monogram" aria-hidden="true">
                {room.workspace.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{room.workspace.name}</span>
            </>
          )}
        </div>
        {/* A room named after its workspace would only repeat the line above. */}
        {roomTitle.trim().toLowerCase() === room.workspace.name.trim().toLowerCase() ? null : <div className="room-title">{roomTitle}</div>}
        {display.progress && total > 1 ? (
          <div className="room-progress" aria-label={`${visited.length} of ${total} opened`}>
            <span className="room-progress-bar" aria-hidden="true">
              <span style={{ width: `${(visited.length / total) * 100}%` }} />
            </span>
            <span>{visited.length === total ? 'All opened' : `${visited.length} of ${total} opened`}</span>
          </div>
        ) : null}
        <nav className="room-items" aria-label="Contents">
          {room.items.map((item, position) => (
            <a
              key={item.id}
              href={`${basePath}/${item.slug}`}
              className="room-item"
              aria-current={item.id === current.id ? 'true' : undefined}
              data-visited={display.progress && visited.includes(item.id)}
              onClick={(event) => {
                // Let modified clicks (new tab, new window) behave as ordinary links.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                open(item);
              }}
            >
              <span className="room-item-icon">{display.numbers ? position + 1 : <ItemIcon type={item.type} />}</span>
              <span className="room-item-text">
                <span className="room-item-title">{item.title}</span>
                <span className="room-item-meta">
                  {TYPE_LABEL[item.type] ?? 'Web page'}
                  {display.progress && visited.includes(item.id) && item.id !== current.id ? ' · Opened' : ''}
                </span>
              </span>
              {display.progress && visited.includes(item.id) && item.id !== current.id ? <Check className="room-item-check" aria-label="Opened" /> : null}
            </a>
          ))}
        </nav>
        {room.sidebarCta ? (
          <div className="room-sidebar-cta">
            <CtaLink cta={room.sidebarCta} className="btn btn-primary btn-block" onPress={() => trackClick('sidebar', room.sidebarCta!.label)} />
          </div>
        ) : null}
        {display.share && shareUrl ? <RoomShare url={shareUrl} title={roomTitle} /> : null}
        {footer && (footer.text || footer.showFello) ? (
          <div className="room-footer">
            {footer.text ? (
              footer.url ? (
                <a href={footer.url} target="_blank" rel="noopener noreferrer">
                  {footer.text}
                </a>
              ) : (
                <span>{footer.text}</span>
              )
            ) : null}
            {footer.showFello ? <span>Powered by Pipemouse</span> : null}
          </div>
        ) : null}
      </aside>

      <div className="room-main">
        <header className="room-header">
          <button type="button" className="icon-button room-menu" aria-label="Open contents" onClick={() => setDrawerOpen(true)}>
            <Menu width={18} height={18} aria-hidden="true" />
          </button>
          {total > 1 ? (
            <div className="room-nav">
              <button type="button" className="icon-button" aria-label="Previous item" disabled={!previous} onClick={() => previous && open(previous)}>
                <ChevronLeft width={18} height={18} aria-hidden="true" />
              </button>
              <span className="room-count">
                {index + 1} / {total}
              </span>
              <button type="button" className="icon-button" aria-label="Next item" disabled={!following} onClick={() => following && open(following)}>
                <ChevronRight width={18} height={18} aria-hidden="true" />
              </button>
            </div>
          ) : null}
          <h1 className="room-header-title truncate" style={{ fontSize: 14 }}>
            {current.title}
          </h1>
          {itemCta ? <CtaLink cta={itemCta} className="btn btn-secondary-cta" onPress={() => trackClick('item', itemCta.label)} /> : null}
          {room.headerCta ? <CtaLink cta={room.headerCta} className="btn btn-primary" onPress={() => trackClick('header', room.headerCta!.label)} /> : null}
        </header>
        {room.track.published ? null : (
          <div className="room-draft" role="status">
            Draft preview. Only members of this workspace can see this room until it is published.
          </div>
        )}
        <main className="room-stage" inert={gated}>
          {room.items
            .filter((item) => mounted.includes(item.id))
            .map((item) => (
              <div key={item.id} className="room-pane" data-kind={item.renderMode} data-active={item.id === current.id}>
                <Frame item={item} room={room} />
              </div>
            ))}
          {room.track.showNextButton && next ? (
            <button type="button" className="room-next" onClick={() => open(next)}>
              <span className="truncate">
                <small>Next</small>
                {next.title}
              </span>
              <ArrowRight aria-hidden="true" />
            </button>
          ) : null}
          {room.track.showNextButton && !next && primaryCta ? (
            <a className="room-next" data-primary="true" href={primaryCta.url} target="_blank" rel="noopener noreferrer" onClick={() => trackClick('end', primaryCta.label)}>
              <span className="truncate">{primaryCta.label}</span>
              <ArrowRight aria-hidden="true" />
            </a>
          ) : null}
        </main>
        {gated && form ? <RoomGate form={form} workspace={room.workspace.slug} track={room.track.slug} onDone={() => setUnlocked(true)} /> : null}
      </div>
    </div>
  );
}
