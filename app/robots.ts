import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Only the public site is for search and answer engines. The app, buyer rooms and the API are not. */
export default function robots(): MetadataRoute.Robots {
  const disallow = ['/w/', '/r/', '/api/', '/auth/', '/invite/', '/onboarding', '/content/'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      // AI search and answer engines are welcome to read and cite the public site.
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'], allow: '/', disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
