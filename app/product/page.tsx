import { MarketingPageView, marketingMetadata } from '@/components/site/MarketingPage';

export const metadata = marketingMetadata('/product');

export default function Page() {
  return <MarketingPageView path="/product" />;
}
