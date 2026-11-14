import { ImageResponse } from 'next/og';

export const alt = 'Pipemouse: send buyers a room, not a pile of links';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The preview card shown when a link to Pipemouse is shared. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#1d1630', color: '#f6f4f1', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 700 }}>
          <svg width="56" height="56" viewBox="0 0 32 32" style={{ marginRight: 18 }}>
            <rect width="32" height="32" rx="8" fill="#f6f4f1" />
            <path d="M6 23.5h4.5a3 3 0 0 0 3-3" fill="none" stroke="#e0a019" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M10.5 20.5c0-4.6 3.6-8 8-8 3.4 0 5.9 2 7.6 5.4.5 1-.1 2-1.2 2.2-2.6.5-5.6.6-8.4.6-2.4 0-4.5-.1-6-.2Z" fill="#1d1630" />
            <circle cx="16.4" cy="11.6" r="3.4" fill="#1d1630" />
            <circle cx="16.4" cy="11.6" r="1.4" fill="#f6f4f1" />
            <circle cx="21.6" cy="16.6" r="1.1" fill="#f6f4f1" />
          </svg>
          Pipemouse
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>Send buyers a room,</div>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>not a pile of links.</div>
          <div style={{ display: 'flex', marginTop: 36, fontSize: 32, color: '#d6d0e6' }}>See who opened it, what they read and for how long.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, color: '#1c1a05' }}>
          <div style={{ display: 'flex', background: '#ffc247', borderRadius: 10, padding: '12px 24px', fontWeight: 700 }}>Starter is free</div>
        </div>
      </div>
    ),
    size,
  );
}
