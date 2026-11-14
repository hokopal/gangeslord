import type { NextConfig } from 'next';

// Sent with every response. Rooms show other sites' pages in frames, so what Pipemouse may load
// is left open; what is locked down is who may frame Pipemouse, and the browser features it never uses.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Only Pipemouse itself may put its pages in a frame, which stops click-hijacking of the app.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Forms may only post to Pipemouse, or be sent on to Paddle's billing page.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://*.paddle.com; object-src 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Other sites learn only that a visitor came from Pipemouse, never which room.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://buy.paddle.com" "https://sandbox-buy.paddle.com"), usb=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  // Every builder page is per-user and behind sign-in, so nothing here can be prerendered.
  // Revisit cacheComponents for the public room viewer (phase 3).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
