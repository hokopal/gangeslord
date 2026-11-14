import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** The public pages search engines should know about. The app and buyer rooms are deliberately absent. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-11-10');
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cookies`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
