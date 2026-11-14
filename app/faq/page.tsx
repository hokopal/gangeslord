import { MarketingPageView, marketingMetadata } from '@/components/site/MarketingPage';

export const metadata = marketingMetadata('/faq');

export default function Page() {
  return <MarketingPageView path="/faq" />;
}
