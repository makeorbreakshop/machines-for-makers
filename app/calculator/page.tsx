export const runtime = 'nodejs';

import { Metadata } from 'next';
import { getLogoUrl } from '@/lib/services/logo-service';
import { getSubscriberCount } from '@/lib/services/convertkit-service';
import CalculatorLanding from './components/CalculatorLanding';

export const metadata: Metadata = {
  title: 'Machine Business Calculator: Real Profit/Loss Analysis',
  description: 'Calculate your actual hourly rate, customer acquisition costs, and true profitability before starting your laser cutting business.',
  robots: 'noindex, nofollow',
};

export default async function CalculatorLandingPage() {
  const logoUrl = await getLogoUrl();
  const subscriberCount = await getSubscriberCount();
  
  return <CalculatorLanding 
    logoUrl={logoUrl} 
    subscriberCount={subscriberCount}
  />;
}