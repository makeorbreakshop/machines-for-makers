import { TrendingDown, DollarSign, Clock, Award, Mail } from 'lucide-react';
import { DealAlertsExpander } from '@/components/email/deal-alerts-expander';

interface PriceDropsHeroProps {
  stats?: {
    totalDrops: number;
    totalSavings: number;
    biggestDrop: number;
    allTimeLows: number;
  };
}

export function PriceDropsHero({ stats }: PriceDropsHeroProps) {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Main Content */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            Price Drops & Deals
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Track real-time price drops on laser cutters, 3D printers, and CNC machines.<br className="hidden sm:inline" />
            Never miss a deal with our automated price monitoring system.
          </p>
        </div>

        {/* Call to Action */}
        <div className="max-w-xl mx-auto text-center">
          <DealAlertsExpander />
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Set it and forget it - we'll watch prices while you work
          </p>
        </div>
      </div>
    </div>
  );
}