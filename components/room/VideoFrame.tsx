'use client';

import { useEffect, useRef } from 'react';
import type { PdfReport } from './PdfViewer';

const PLAYER = 'https://www.youtube-nocookie.com';
const REPORT_EVERY_MS = 15_000;

/** Works out how much has been watched from the player's position updates. Pure, so it can be tested. */
export function watchProgress() {
  let duration = 0;
  let last = -1;
  let played = 0;
  let furthest = 0;
  return {
    /** Feed one update from the player: its position and, when known, the video's length, in seconds. */
    update(position: unknown, length: unknown) {
      if (typeof length === 'number' && length > 0) duration = length;
      if (typeof position !== 'number' || position < 0) return;
      // Only ordinary playback counts as watching: a jump forward is a skip, a jump back is a rewind.
      const step = position - last;
      if (last >= 0 && step > 0 && step < 2) played += step;
      last = position;
      furthest = Math.max(furthest, position);
    },
    /** Share played and furthest point reached, 0 to 100; null until the video's length is known. */
    result() {
      if (duration <= 0) return null;
      const share = (seconds: number) => Math.min(100, Math.round((seconds / duration) * 100));
      return { percent: share(played), furthest: share(furthest) };
    },
  };
}

/**
 * A YouTube video in a room. In a published room it also reports how much of the video was
 * watched, using the progress updates the player sends to the page that embeds it.
 */
export function VideoFrame({ src, title, report }: { src: string; title: string; report?: PdfReport }) {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const element = frame.current;
    if (!report || !element) return;
    const progress = watchProgress();
    let sent = '';

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== PLAYER || event.source !== element.contentWindow) return;
      let data: { info?: { currentTime?: unknown; duration?: unknown } | null } | null = null;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.info) progress.update(data.info.currentTime, data.info.duration);
    };
    // The player only sends updates to a page that has asked for them.
    const listen = () => element.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), PLAYER);
    const flush = () => {
      const result = progress.result();
      if (!result || JSON.stringify(result) === sent) return;
      sent = JSON.stringify(result);
      void fetch('/r/api/video', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...report, ...result }), keepalive: true }).catch(() => undefined);
    };

    window.addEventListener('message', onMessage);
    element.addEventListener('load', listen);
    listen();
    const timer = window.setInterval(flush, REPORT_EVERY_MS);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('message', onMessage);
      element.removeEventListener('load', listen);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', flush);
      flush();
    };
  }, [report]);

  return (
    <iframe
      ref={frame}
      title={title}
      src={report ? `${src}?enablejsapi=1` : src}
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}
