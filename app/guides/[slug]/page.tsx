import { notFound } from 'next/navigation';
import { MarketingPageView, marketingMetadata } from '@/components/site/MarketingPage';
import { pagesUnder } from '@/lib/marketing';

export const dynamicParams = false;

export function generateStaticParams() {
  return pagesUnder('/guides').map((p) => ({ slug: p.path.split('/').pop()! }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return marketingMetadata(`/guides/${slug}`);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!pagesUnder('/guides').some((p) => p.path === `/guides/${slug}`)) notFound();
  return <MarketingPageView path={`/guides/${slug}`} />;
}
