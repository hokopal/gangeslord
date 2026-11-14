'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Room } from '@/lib/room';

const HEARTBEAT_MS = 5000;

function send(payload: Record<string, unknown>) {
  // keepalive lets the last signal finish even if the visitor is leaving the page.
  void fetch('/r/api/event', {
    method: 'POST',
    keepalive: true,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/**
 * Reports a buyer's activity in a published room: which items they open, how long each
 * stays in view, and which buttons they press. Time only counts while the tab is visible
 * and focused. Draft previews report nothing.
 */
export function useRoomTracking(room: Room, currentId: string) {
  const session = useRef<string | null>(null);
  const current = useRef(currentId);
  const reported = useRef<string | null>(null);

  const reportView = useCallback((how: string) => {
    if (!session.current || reported.current === current.current) return;
    reported.current = current.current;
    send({ session: session.current, item: current.current, type: 'item_view', meta: how });
  }, []);

  useEffect(() => {
    if (!room.track.published) return;
    let cancelled = false;
    const url = new URL(window.location.href);
    // A seller previewing the room as a contact must not be recorded as that contact.
    if (url.searchParams.get('preview') === '1') return;
    const share = url.searchParams.get('r');
    fetch('/r/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workspace: room.workspace.slug,
        track: room.track.slug,
        share,
        referrer: document.referrer,
        utmSource: url.searchParams.get('utm_source'),
        utmMedium: url.searchParams.get('utm_medium'),
        utmCampaign: url.searchParams.get('utm_campaign'),
      }),
    })
      .then((response) => response.json())
      .then((data: { session: string | null }) => {
        if (cancelled || !data.session) return;
        session.current = data.session;
        reportView('direct');
      })
      .catch(() => {});
    // The personal-link token has done its job; keep it out of the address bar and of copied links.
    if (share) {
      url.searchParams.delete('r');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    return () => {
      cancelled = true;
    };
  }, [room.track.published, room.track.slug, room.workspace.slug, reportView]);

  useEffect(() => {
    current.current = currentId;
    reportView('navigation');
  }, [currentId, reportView]);

  useEffect(() => {
    if (!room.track.published) return;
    const timer = window.setInterval(() => {
      if (!session.current || document.visibilityState !== 'visible' || !document.hasFocus()) return;
      send({ session: session.current, item: current.current, type: 'heartbeat' });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [room.track.published]);

  /** Call when a button is pressed. `placement` is header, sidebar, item or end. */
  return useCallback((placement: string, label: string) => {
    if (!session.current) return;
    send({ session: session.current, item: current.current, type: 'cta_click', meta: `${placement}: ${label}` });
  }, []);
}
