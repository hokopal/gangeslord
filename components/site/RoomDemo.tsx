'use client';

import { FileText, Globe, SquarePlay } from 'lucide-react';
import { useEffect, useState } from 'react';

type DemoItem = { title: string; kind: 'web' | 'pdf' | 'video'; detail: string };

const ITEMS: DemoItem[] = [
  { title: 'Why teams outgrow shared folders', kind: 'web', detail: 'Web page' },
  { title: 'Security overview', kind: 'pdf', detail: 'PDF, 6 pages' },
  { title: 'Product tour', kind: 'video', detail: 'Video, 4 min' },
  { title: 'Implementation overview', kind: 'pdf', detail: 'PDF, 2 pages' },
];

/** Seconds on an item before the demo counts the buyer as engaged with it. */
const THRESHOLD = 8;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function Icon({ kind }: { kind: DemoItem['kind'] }) {
  if (kind === 'pdf') return <FileText aria-hidden="true" />;
  if (kind === 'video') return <SquarePlay aria-hidden="true" />;
  return <Globe aria-hidden="true" />;
}

function Pane({ item }: { item: DemoItem }) {
  if (item.kind === 'video') {
    return (
      <div className="demo-video">
        <span className="demo-play" aria-hidden="true" />
        <span className="demo-video-bar" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className={item.kind === 'pdf' ? 'demo-doc demo-doc-pdf' : 'demo-doc'}>
      <strong>{item.title}</strong>
      <span className="demo-line" style={{ width: '92%' }} />
      <span className="demo-line" style={{ width: '84%' }} />
      <span className="demo-line" style={{ width: '88%' }} />
      <span className="demo-line" style={{ width: '56%' }} />
      <span className="demo-block" />
      <span className="demo-line" style={{ width: '90%' }} />
      <span className="demo-line" style={{ width: '72%' }} />
    </div>
  );
}

/**
 * A working miniature of a Pipemouse room. Choosing an item swaps the pane, as in a real room,
 * and the strip underneath shows what the seller sees: time building up on whatever is open.
 */
export function RoomDemo() {
  const [active, setActive] = useState(0);
  const [seconds, setSeconds] = useState<number[]>(() => ITEMS.map(() => 0));

  useEffect(() => {
    const timer = window.setInterval(() => {
      // Like the real product, time only counts while the page is actually in view.
      if (document.visibilityState !== 'visible') return;
      setSeconds((list) => list.map((value, index) => (index === active ? value + 1 : value)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const engaged = seconds.filter((value) => value >= THRESHOLD).length;

  return (
    <div className="demo" aria-label="Interactive example of a Pipemouse room">
      <div className="demo-room">
        <div className="demo-side">
          <div className="demo-brand">Northwind</div>
          <div className="demo-track">For Dana at Acme</div>
          {ITEMS.map((item, index) => (
            <button key={item.title} type="button" className="demo-item" aria-pressed={index === active} onClick={() => setActive(index)}>
              <Icon kind={item.kind} />
              <span>{item.title}</span>
            </button>
          ))}
          <span className="demo-cta">Book a demo</span>
        </div>
        <div className="demo-pane">
          <div className="demo-pane-head">
            <span>{ITEMS[active].title}</span>
            <span>{ITEMS[active].detail}</span>
          </div>
          <Pane item={ITEMS[active]} />
        </div>
      </div>

      <div className="demo-readout" aria-live="off">
        <div className="demo-readout-head">
          <span>
            <span className="demo-dot" aria-hidden="true" />
            What you see: Dana is in the room
          </span>
          <span>
            {engaged} of {ITEMS.length} engaged
          </span>
        </div>
        <ul>
          {ITEMS.map((item, index) => (
            <li key={item.title} data-active={index === active} data-engaged={seconds[index] >= THRESHOLD}>
              <span className="demo-readout-title">{item.title}</span>
              <span className="demo-meter" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (seconds[index] / (THRESHOLD * 2)) * 100)}%` }} />
              </span>
              <span className="demo-time">{clock(seconds[index])}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="demo-caption">An example with made-up names. Click an item and watch the time build, as it does for a real buyer.</p>
    </div>
  );
}
