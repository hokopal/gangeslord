import { MARKETING_PAGES, toMarkdown } from '@/lib/marketing';
import { SITE_DEFINITION, SITE_URL } from '@/lib/site';

/** Every public content page in one markdown file, so an AI agent can read the whole site in a single request. */
export function GET() {
  const body = [`# Pipemouse: full site content`, '', `> ${SITE_DEFINITION}`, '', `Summary: ${SITE_URL}/llms.txt`, '', ...MARKETING_PAGES.map((p) => `${toMarkdown(p, SITE_URL)}\n\n---\n`)].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
