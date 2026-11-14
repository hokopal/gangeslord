import { MarketingPageView, marketingMetadata } from '@/components/site/MarketingPage';

export const metadata = marketingMetadata('/what-is-a-sales-room');

export default function Page() {
  return <MarketingPageView path="/what-is-a-sales-room" />;
}
