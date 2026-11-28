import { MarketingPageView, marketingMetadata } from '@/components/site/MarketingPage';

export const metadata = marketingMetadata('/os');

export default function Page() {
  return <MarketingPageView path="/os" />;
}
