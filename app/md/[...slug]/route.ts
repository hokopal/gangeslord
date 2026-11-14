import { MARKETING_PAGES, toMarkdown } from '@/lib/marketing';
import { SITE_URL } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return MARKETING_PAGES.map((p) => ({ slug: p.path.split('/').filter(Boolean) }));
}

/** A markdown copy of each content page, for AI agents that read text rather than HTML. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = MARKETING_PAGES.find((p) => p.path === `/${slug.join('/')}`);
  if (!page) return new Response('Not found', { status: 404 });
  return new Response(toMarkdown(page, SITE_URL), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      link: `<${SITE_URL}${page.path}>; rel="canonical"`,
    },
  });
}
