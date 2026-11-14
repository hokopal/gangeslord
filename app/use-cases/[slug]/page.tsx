import { notFound } from 'next/navigation';
import { MarketingPageView, marketingMetadata } from '@/components/site/MarketingPage';
import { pagesUnder } from '@/lib/marketing';

export const dynamicParams = false;

export function generateStaticParams() {
  return pagesUnder('/use-cases').map((p) => ({ slug: p.path.split('/').pop()! }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return marketingMetadata(`/use-cases/${slug}`);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!pagesUnder('/use-cases').some((p) => p.path === `/use-cases/${slug}`)) notFound();
  return <MarketingPageView path={`/use-cases/${slug}`} />;
}
