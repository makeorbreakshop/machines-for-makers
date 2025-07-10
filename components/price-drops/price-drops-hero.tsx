import { TrendingDown, DollarSign, Clock, Award } from 'lucide-react';

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
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-xl p-8 mb-8">
      <div className="relative z-10">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Price Drops & Deals
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
          Track real-time price drops on laser cutters, 3D printers, and CNC machines. 
          Never miss a deal with our automated price monitoring system.
        </p>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <TrendingDown className="w-5 h-5" />
                <span className="text-sm font-medium">Active Deals</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalDrops}
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium">Total Savings</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${stats.totalSavings.toLocaleString()}
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">Biggest Drop</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.biggestDrop}%
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Award className="w-5 h-5" />
                <span className="text-sm font-medium">All-Time Lows</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.allTimeLows}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute -bottom-4 -left-4 w-96 h-96 bg-primary rounded-full blur-3xl" />
      </div>
    </div>
  );
}