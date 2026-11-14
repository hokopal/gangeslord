import { MarketingPageView, marketingMetadata } from '@/components/site/MarketingPage';

export const metadata = marketingMetadata('/integrations');

export default function Page() {
  return <MarketingPageView path="/integrations" />;
}
