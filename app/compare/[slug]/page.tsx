import { notFound } from 'next/navigation';
import { MarketingPageView, marketingMetadata } from '@/components/site/MarketingPage';
import { pagesUnder } from '@/lib/marketing';

export const dynamicParams = false;

export function generateStaticParams() {
  return pagesUnder('/compare').map((p) => ({ slug: p.path.split('/').pop()! }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return marketingMetadata(`/compare/${slug}`);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!pagesUnder('/compare').some((p) => p.path === `/compare/${slug}`)) notFound();
  return <MarketingPageView path={`/compare/${slug}`} />;
}
