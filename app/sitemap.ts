import type { MetadataRoute } from 'next';
import { MARKETING_PAGES } from '@/lib/marketing';
import { SITE_URL } from '@/lib/site';

/** The public pages search engines should know about. The app and buyer rooms are deliberately absent. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-11-10');
  return [
    { url: `${SITE_URL}/`, lastModified: new Date('2026-11-15'), changeFrequency: 'weekly', priority: 1 },
    ...MARKETING_PAGES.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      lastModified: new Date(p.updated),
      changeFrequency: 'monthly' as const,
      priority: ['/os', '/product', '/pricing'].includes(p.path) ? 0.9 : 0.7,
    })),
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cookies`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
