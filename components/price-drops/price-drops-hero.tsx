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
    <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Main Content */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-semibold text-gray-900 dark:text-white mb-4 tracking-tight">
            Price Drops & Deals
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Track real-time price drops on laser cutters, 3D printers, and CNC machines. 
            Never miss a deal with our automated price monitoring system.
          </p>
        </div>

        {/* Call to Action */}
        <div className="max-w-2xl mx-auto text-center">
          <DealAlertsExpander />
          
          <p className="text-sm text-gray-500 mt-4">
            Set it and forget it - we'll watch prices while you work
          </p>
        </div>
      </div>
    </div>
  );
}