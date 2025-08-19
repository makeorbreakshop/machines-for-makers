export const runtime = 'nodejs';

import { Metadata } from 'next';
import LaserComparisonLanding from './components/LaserComparisonLanding';
import LaserComparisonServer from './components/LaserComparisonServer';

export const metadata: Metadata = {
  title: 'Compare 157 Laser Cutters Side-by-Side | Free Comparison Tool',
  description: 'Find your perfect laser cutter. Compare specs, prices, and features of 157 machines from top brands. No guesswork, just data.',
  robots: 'noindex, nofollow', // Landing page, not for SEO
};

export default function LaserComparisonPage() {
  return (
    <>
      <LaserComparisonServer />
      <LaserComparisonLanding />
    </>
  );
}