import { MarketingPageView, marketingMetadata } from '@/components/site/MarketingPage';

export const metadata = marketingMetadata('/pricing');

export default function Page() {
  return <MarketingPageView path="/pricing" />;
}
