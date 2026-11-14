'use client';

import { Eraser, Highlighter, Minus, MousePointer2, Pen, Plus, StickyNote } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask, TextLayer } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';

const ZOOMS = [0.75, 1, 1.25, 1.5, 2];
const MAX_PAGE_WIDTH = 1100;
const REPORT_EVERY_MS = 15_000;

type TextLayerClass = typeof TextLayer;
/** Where page-reading time and marks are reported: the room and item this document is shown in. */
export type PdfReport = { workspace: string; track: string; item: string };

type Tool = 'select' | 'pen' | 'marker' | 'note' | 'erase';
/** A guest's mark on a page. Positions are fractions of the page, so marks stay put at any zoom or screen size. */
export type Mark = { id: string; kind: 'pen' | 'marker' | 'note'; page: number; mark: { p?: number[]; x?: number; y?: number }; body: string };
const INK = { pen: { color: '#e03131', width: 0.004, opacity: 1 }, marker: { color: '#fcc419', width: 0.022, opacity: 0.45 } } as const;
const TOOLS: { tool: Tool; label: string; icon: typeof Pen }[] = [
  { tool: 'select', label: 'Select text', icon: MousePointer2 },
  { tool: 'pen', label: 'Pen', icon: Pen },
  { tool: 'marker', label: 'Marker', icon: Highlighter },
  { tool: 'note', label: 'Sticky note', icon: StickyNote },
  { tool: 'erase', label: 'Eraser', icon: Eraser },
];
type MarksResult = { identified: boolean; marks: Mark[] };

/** The guest's drawings and pinned notes on one document, or null when they cannot be fetched. */
async function fetchMarks(report: PdfReport): Promise<MarksResult | null> {
  try {
    const response = await fetch(`/r/api/notes?workspace=${report.workspace}&track=${report.track}&marks=${report.item}`);
    const result = (await response.json()) as { ok?: boolean; identified?: boolean; marks?: Mark[] };
    return result.ok ? { identified: Boolean(result.identified), marks: result.marks ?? [] } : null;
  } catch {
    // Marks are an extra; the document itself still reads fine without them.
    return null;
  }
}

const round = (value: number) => Math.round(Math.min(Math.max(value, 0), 1) * 10000) / 10000;

type PageProps = {
  doc: PDFDocumentProxy; number: number; width: number; label: string; shape: number; Text: TextLayerClass;
  marks: Mark[]; tool: Tool;
  onStroke: (page: number, kind: 'pen' | 'marker', points: number[]) => void;
  onPin: (page: number, x: number, y: number, body: string) => void;
  onErase: (id: string) => void;
};

/** One page. It keeps its place in the document from the start and draws itself only when it is near the screen. */
function PdfPage({ doc, number, width, label, shape, Text, marks, tool, onStroke, onPin, onErase }: PageProps) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [ratio, setRatio] = useState(shape);
  const [live, setLive] = useState<number[] | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [openPin, setOpenPin] = useState<string | null>(null);

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: '800px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near || width < 50 || !canvas.current) return;
    let task: RenderTask | null = null;
    let layer: TextLayer | null = null;
    let cancelled = false;
    const target = canvas.current;
    const words = text.current;
    void doc.getPage(number).then((page) => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      // Draw at the screen's pixel density, capped so very large pages stay affordable.
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * density });
      target.width = Math.floor(viewport.width);
      target.height = Math.floor(viewport.height);
      const context = target.getContext('2d');
      if (!context) return;
      task = page.render({ canvasContext: context, viewport });
      task.promise.catch(() => undefined); // a cancelled draw is expected when the page scrolls away or resizes
      // Invisible, selectable text laid exactly over the drawing: it is what makes the page selectable,
      // searchable with the browser's find, and readable by a screen reader.
      if (!words) return;
      const laid = page.getViewport({ scale: width / base.width });
      words.replaceChildren();
      words.style.setProperty('--scale-factor', String(laid.scale));
      layer = new Text({ textContentSource: page.streamTextContent(), container: words, viewport: laid });
      layer.render().catch(() => undefined);
    });
    return () => {
      cancelled = true;
      task?.cancel();
      layer?.cancel();
    };
  }, [doc, number, near, width, Text]);

  /** Where on the page a pointer is, as fractions of its width and height. */
  const at = (event: React.PointerEvent | React.MouseEvent): [number, number] => {
    const box = holder.current!.getBoundingClientRect();
    return [round((event.clientX - box.left) / box.width), round((event.clientY - box.top) / box.height)];
  };
  const drawing = tool === 'pen' || tool === 'marker';
  const path = (points: number[]) => points.reduce((out, value, i) => out + (i % 2 === 0 ? `${i ? ' ' : ''}${value}` : `,${value * ratio}`), '');

  return (
    <div ref={holder} className="pdf-page" data-page={number} style={{ width, height: Math.round(width * ratio) }}>
      {near ? (
        <>
          <canvas ref={canvas} aria-hidden="true" />
          <div ref={text} className="pdf-text" role="group" aria-label={label} />
        </>
      ) : null}
      <svg
        className="pdf-marks"
        data-tool={tool}
        viewBox={`0 0 1 ${ratio}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        onPointerDown={(event) => {
          if (!drawing) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setLive(at(event));
        }}
        onPointerMove={(event) => {
          if (!live) return;
          const [x, y] = at(event);
          // Skip points that barely moved: smoother lines and far less to store.
          if (Math.hypot(x - live[live.length - 2], y - live[live.length - 1]) < 0.003) return;
          setLive([...live, x, y]);
        }}
        onPointerUp={() => {
          if (live && drawing) onStroke(number, tool, live.length === 2 ? [...live, ...live] : live);
          setLive(null);
        }}
        onPointerCancel={() => setLive(null)}
        onClick={(event) => {
          if (tool !== 'note') return;
          const [x, y] = at(event);
          setDraft({ x, y });
        }}
      >
        {marks.filter((m) => m.kind !== 'note' && m.mark.p).map((m) => (
          <polyline key={m.id} points={path(m.mark.p!)} fill="none" stroke={INK[m.kind as 'pen' | 'marker'].color} strokeWidth={INK[m.kind as 'pen' | 'marker'].width}
            strokeOpacity={INK[m.kind as 'pen' | 'marker'].opacity} strokeLinecap="round" strokeLinejoin="round" onClick={() => tool === 'erase' && onErase(m.id)} />
        ))}
        {live && drawing ? <polyline points={path(live)} fill="none" stroke={INK[tool].color} strokeWidth={INK[tool].width} strokeOpacity={INK[tool].opacity} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </svg>
      {marks.filter((m) => m.kind === 'note').map((m) => (
        <div key={m.id} className="pdf-pin" style={{ left: `${(m.mark.x ?? 0) * 100}%`, top: `${(m.mark.y ?? 0) * 100}%` }}>
          <button type="button" aria-label={`Sticky note: ${m.body}`} aria-expanded={openPin === m.id} onClick={() => (tool === 'erase' ? onErase(m.id) : setOpenPin(openPin === m.id ? null : m.id))}>
            <StickyNote width={14} height={14} aria-hidden="true" />
          </button>
          {openPin === m.id ? <p className="pdf-pin-note">{m.body}</p> : null}
        </div>
      ))}
      {draft ? (
        <form
          className="pdf-pin pdf-pin-draft"
          style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
          onSubmit={(event) => {
            event.preventDefault();
            const body = String(new FormData(event.currentTarget).get('body') ?? '').trim();
            if (body) onPin(number, draft.x, draft.y, body);
            setDraft(null);
          }}
        >
          <textarea name="body" className="textarea" rows={3} maxLength={2000} required autoFocus placeholder="Write a note for this spot…" aria-label="Sticky note" />
          <span>
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
            <button type="button" className="btn btn-sm" onClick={() => setDraft(null)}>Cancel</button>
          </span>
        </form>
      ) : null}
    </div>
  );
}

/**
 * Pipemouse's own PDF viewer: every page in one scrolling column, drawn as it comes into view,
 * with zoom, a page counter and, in a room, tools for the buyer to draw on and pin notes to pages.
 * Given `overlay`, it shows those marks read-only: how a room's owner sees what one buyer drew.
 */
export function PdfViewer({ src, title, report, overlay }: { src: string; title: string; report?: PdfReport; overlay?: Mark[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [Text, setText] = useState<TextLayerClass | null>(null);
  const [shape, setShape] = useState(1.414);
  const [failed, setFailed] = useState(false);
  const [fit, setFit] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [tool, setTool] = useState<Tool>('select');
  const [marks, setMarks] = useState<Mark[]>(overlay ?? []);
  const [identified, setIdentified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
        loaded = await pdfjs.getDocument({ url: src }).promise;
        const first = (await loaded.getPage(1)).getViewport({ scale: 1 });
        if (cancelled) return void loaded.destroy();
        setShape(first.height / first.width);
        setText(() => pdfjs.TextLayer);
        setDoc(loaded);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
  }, [src]);

  // Pages fit the width of the viewer, whatever the screen, and follow it when it changes.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setFit(Math.min(element.clientWidth - 32, MAX_PAGE_WIDTH)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Time on each page, for the room's owner: counted while the document is actually on screen,
  // and sent every few seconds and whenever the tab is hidden, so little is lost if it is closed.
  const current = useRef(1);
  const pending = useRef<Record<number, number>>({});
  const loaded = doc !== null;
  useEffect(() => {
    if (!report || !loaded) return;
    const flush = () => {
      if (Object.keys(pending.current).length === 0) return;
      const body = JSON.stringify({ ...report, pages: pending.current });
      pending.current = {};
      void fetch('/r/api/pages', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
    };
    const tick = window.setInterval(() => {
      // A document kept alive in a hidden pane has no size; one in a background tab is not being read.
      if (document.visibilityState !== 'visible' || !scroller.current?.clientWidth) return;
      pending.current[current.current] = (pending.current[current.current] ?? 0) + 1;
    }, 1000);
    const send = window.setInterval(flush, REPORT_EVERY_MS);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(send);
      document.removeEventListener('visibilitychange', flush);
      flush();
    };
  }, [report, loaded]);

  // The guest's own marks on this document. Only they and the room's owner can ever see them.
  const showMarks = (result: MarksResult | null) => {
    if (!result) return;
    setIdentified(result.identified);
    setMarks(result.marks);
  };
  useEffect(() => {
    if (!report || !loaded) return;
    let cancelled = false;
    void fetchMarks(report).then((result) => {
      if (!cancelled) showMarks(result);
    });
    return () => {
      cancelled = true;
    };
  }, [report, loaded]);

  async function change(method: 'POST' | 'DELETE', payload: Record<string, unknown>) {
    if (!report) return;
    await fetch('/r/api/notes', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workspace: report.workspace, track: report.track, ...payload }) }).catch(() => undefined);
    showMarks(await fetchMarks(report));
  }
  const addMark = (kind: Mark['kind'], pageNumber: number, mark: Mark['mark'], body: string) => {
    // Shown at once, then replaced by the saved copy.
    setMarks((list) => [...list, { id: `new-${Date.now()}`, kind, page: pageNumber, mark, body }]);
    void change('POST', { item_slug: report?.item, kind, body, page: pageNumber, mark });
  };

  // The page counter follows whichever page crosses the middle of the viewer.
  function onScroll() {
    const element = scroller.current;
    if (!element) return;
    const middle = element.getBoundingClientRect().top + element.clientHeight / 2;
    for (const child of element.querySelectorAll<HTMLElement>('.pdf-page')) {
      if (child.getBoundingClientRect().bottom >= middle) {
        current.current = Number(child.dataset.page);
        return setPage(current.current);
      }
    }
  }

  if (failed) {
    return (
      <div className="preview-message">
        <div>
          <h2>This document couldn’t be shown</h2>
          <p>
            <a className="link" href={src} target="_blank" rel="noopener noreferrer">
              Open it in a new tab
            </a>{' '}
            instead.
          </p>
        </div>
      </div>
    );
  }

  const index = ZOOMS.indexOf(zoom);
  return (
    <div className="pdf">
      <div className="pdf-bar">
        <span className="pdf-count" aria-live="polite">
          {doc ? `Page ${page} of ${doc.numPages}` : 'Loading…'}
        </span>
        {report && doc ? (
          <div className="pdf-tools" role="toolbar" aria-label="Mark up this document">
            {TOOLS.map(({ tool: option, label, icon: Icon }) => (
              <button key={option} type="button" className="icon-button" aria-label={label} title={identified || option === 'select' ? label : 'Add a comment first, so the room’s owner knows who is marking this up'}
                aria-pressed={tool === option} disabled={!identified && option !== 'select'} onClick={() => setTool(option)}>
                <Icon width={16} height={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className="icon-button" aria-label="Zoom out" disabled={index <= 0} onClick={() => setZoom(ZOOMS[index - 1])}>
          <Minus width={16} height={16} aria-hidden="true" />
        </button>
        <span className="pdf-zoom">{Math.round(zoom * 100)}%</span>
        <button type="button" className="icon-button" aria-label="Zoom in" disabled={index >= ZOOMS.length - 1} onClick={() => setZoom(ZOOMS[index + 1])}>
          <Plus width={16} height={16} aria-hidden="true" />
        </button>
      </div>
      <div ref={scroller} className="pdf-pages" onScroll={onScroll} tabIndex={0} aria-label={title}>
        {doc && Text
          ? Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i + 1} doc={doc} number={i + 1} width={Math.round(fit * zoom)} label={`Page ${i + 1} of ${title}`} shape={shape} Text={Text}
                marks={marks.filter((m) => m.page === i + 1)} tool={tool}
                onStroke={(n, kind, points) => addMark(kind, n, { p: points }, '')}
                onPin={(n, x, y, body) => addMark('note', n, { x, y }, body)}
                onErase={(id) => {
                  setMarks((list) => list.filter((m) => m.id !== id));
                  void change('DELETE', { note: id });
                }}
              />
            ))
          : null}
      </div>
    </div>
  );
}
