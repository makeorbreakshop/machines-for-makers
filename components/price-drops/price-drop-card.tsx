'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingDown, Trophy } from 'lucide-react';
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
    isNewAllTimeLow: boolean;
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
      return 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 hover:from-indigo-500 hover:to-purple-600';
    } else if (percentage >= 25) {
      return 'bg-red-500 text-white border-0 hover:bg-red-500';
    } else if (percentage >= 15) {
      return 'bg-orange-500 text-white border-0 hover:bg-orange-500';
    } else if (percentage >= 10) {
      return 'bg-amber-500 text-white border-0 hover:bg-amber-500';
    } else {
      return 'bg-emerald-500 text-white border-0 hover:bg-emerald-500';
    }
  };

  const machineSlug = drop.machineName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const detailsUrl = `/products/${machineSlug}`;

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700">
      {/* All-Time Low Badge */}
      {drop.isAllTimeLow && (
        <div className="absolute top-2 right-2 z-10">
          <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            drop.isNewAllTimeLow 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {drop.isNewAllTimeLow ? 'New Record' : 'Previous Low'}
          </div>
        </div>
      )}

      {/* Image */}
      <Link href={detailsUrl} className="block aspect-[4/3] relative overflow-hidden">
        {drop.imageUrl ? (
          <div className="absolute inset-0 bg-white dark:bg-gray-800">
            <Image
              src={drop.imageUrl}
              alt={drop.machineName}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-200 ease-out"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </Link>

      {/* Content - with proper padding */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <Link href={detailsUrl} className="block">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 text-sm">
            {drop.machineName}
          </h3>
        </Link>

        {/* Price Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
              ${drop.currentPrice.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 line-through">
              ${drop.previousPrice.toLocaleString()}
            </span>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-0 font-semibold text-sm px-2 py-0.5">
            ${Math.round(savingsAmount).toLocaleString()} Off
          </Badge>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{formatDistanceToNow(new Date(drop.dropDate), { addSuffix: true })}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-0.5">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="flex-1 hover:bg-gray-50 dark:hover:bg-gray-800 h-8 text-sm font-medium border-gray-200 dark:border-gray-600"
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
              className="hover:bg-gray-50 dark:hover:bg-gray-800 h-8 text-sm font-medium border-gray-200 dark:border-gray-600"
            >
              Price History
            </Button>
          </PriceTooltip>
        </div>
      </div>
    </div>
  );
}