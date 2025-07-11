'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingDown, Award } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PriceTooltip } from '@/components/product/price-tooltip';

interface PriceDropCardProps {
  drop: {
    id: string;
    machineId: string;
    machineName: string;
    company: string;
    currentPrice: number;
    previousPrice: number;
    priceChange: number;
    percentageChange: number;
    dropDate: string;
    isAllTimeLow: boolean;
    productLink: string;
    affiliateLink?: string;
    imageUrl?: string;
    category: string;
    priceCategory?: string;
    award?: string;
    workArea?: string;
    dropType: string;
  };
}

export function PriceDropCard({ drop }: PriceDropCardProps) {
  const savingsAmount = Math.abs(drop.priceChange);
  const savingsPercentage = Math.abs(drop.percentageChange);

  const getDropBadgeColor = () => {
    const percentage = Math.abs(savingsPercentage);
    
    if (drop.isAllTimeLow) {
      return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-400';
    } else if (percentage >= 25) {
      return 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400';
    } else if (percentage >= 15) {
      return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-400';
    } else if (percentage >= 10) {
      return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400';
    } else {
      return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-400';
    }
  };

  const machineSlug = drop.machineName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const detailsUrl = `/products/${machineSlug}`;

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-1">
      {/* Price Drop Badge */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <Badge className={cn('font-bold text-xs px-3 py-1 shadow-lg transform -rotate-1', getDropBadgeColor())}>
          <TrendingDown className="w-3 h-3 mr-1" />
          {savingsPercentage.toFixed(0)}% OFF
        </Badge>
        {drop.isAllTimeLow && (
          <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg font-bold text-xs px-3 py-1">
            <Award className="w-3 h-3 mr-1" />
            All Time Low
          </Badge>
        )}
      </div>

      {/* Image */}
      <Link href={detailsUrl} className="block aspect-square relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {drop.imageUrl ? (
          <Image
            src={drop.imageUrl}
            alt={drop.machineName}
            fill
            className="object-contain p-6 group-hover:scale-110 transition-transform duration-300 ease-out"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </Link>

      {/* Content - with proper padding */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Link href={detailsUrl} className="block">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 text-base leading-tight">
            {drop.machineName}
          </h3>
        </Link>

        {/* Price Section */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              ${drop.currentPrice.toLocaleString()}
            </span>
            <span className="text-base text-gray-500 line-through font-medium">
              ${drop.previousPrice.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full inline-block">
            Save ${savingsAmount.toLocaleString()}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>{formatDistanceToNow(new Date(drop.dropDate), { addSuffix: true })}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="flex-1 hover:bg-gray-50 dark:hover:bg-gray-800 border-2 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 rounded-lg font-semibold h-9"
          >
            <Link href={drop.affiliateLink || drop.productLink} target="_blank" rel="noopener noreferrer">
              View Deal
            </Link>
          </Button>
          <PriceTooltip 
            machineId={drop.machineId} 
            price={drop.currentPrice}
            variant="popover"
          >
            <Button
              size="sm"
              variant="outline"
              className="hover:bg-gray-50 dark:hover:bg-gray-800 border-2 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 rounded-lg font-semibold text-xs h-9"
            >
              Price History
            </Button>
          </PriceTooltip>
        </div>
      </div>
    </div>
  );
}