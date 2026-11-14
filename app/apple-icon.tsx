import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** The Pipemouse mark as a PNG: for phone home screens, and for emails, which cannot show SVG. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill="#2a1f4d" />
        <path d="M6 23.5h4.5a3 3 0 0 0 3-3" fill="none" stroke="#ffc247" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10.5 20.5c0-4.6 3.6-8 8-8 3.4 0 5.9 2 7.6 5.4.5 1-.1 2-1.2 2.2-2.6.5-5.6.6-8.4.6-2.4 0-4.5-.1-6-.2Z" fill="#ffffff" />
        <circle cx="16.4" cy="11.6" r="3.4" fill="#ffffff" />
        <circle cx="16.4" cy="11.6" r="1.4" fill="#2a1f4d" />
        <circle cx="21.6" cy="16.6" r="1.1" fill="#2a1f4d" />
      </svg>
    ),
    size,
  );
}
