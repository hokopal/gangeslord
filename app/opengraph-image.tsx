import { ImageResponse } from 'next/og';

export const alt = 'Pipemouse: your go-to-market, finally working as one';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The preview card shown when a link to Pipemouse is shared. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0e2b2e', color: '#f5f7f4', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 700 }}>
          <svg width="56" height="56" viewBox="0 0 32 32" style={{ marginRight: 18 }}>
            <rect width="32" height="32" rx="8" fill="#f5f7f4" />
            <path d="M6 23.5h4.5a3 3 0 0 0 3-3" fill="none" stroke="#e0a019" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M10.5 20.5c0-4.6 3.6-8 8-8 3.4 0 5.9 2 7.6 5.4.5 1-.1 2-1.2 2.2-2.6.5-5.6.6-8.4.6-2.4 0-4.5-.1-6-.2Z" fill="#0e2b2e" />
            <circle cx="16.4" cy="11.6" r="3.4" fill="#0e2b2e" />
            <circle cx="16.4" cy="11.6" r="1.4" fill="#f5f7f4" />
            <circle cx="21.6" cy="16.6" r="1.1" fill="#f5f7f4" />
          </svg>
          Pipemouse
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>Your go-to-market,</div>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>finally working as one.</div>
          <div style={{ display: 'flex', marginTop: 32, fontSize: 30, color: '#b9cbc6' }}>CRM, workflows, AI agents, and sales rooms in one connected platform.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 27, color: '#1c1a05' }}>
          <div style={{ display: 'flex', background: '#ffc83d', borderRadius: 10, padding: '12px 24px', fontWeight: 700 }}>Pipemouse OS + Rooms</div>
        </div>
      </div>
    ),
    size,
  );
}
