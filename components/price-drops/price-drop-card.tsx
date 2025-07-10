'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingDown, Award } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PriceTooltip } from '@/components/machines/price-tooltip';
import { Button } from '@/components/ui/button';

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
  onCompare?: (machineId: string) => void;
}

export function PriceDropCard({ drop, onCompare }: PriceDropCardProps) {
  const savingsAmount = Math.abs(drop.priceChange);
  const savingsPercentage = Math.abs(drop.percentageChange);

  const getDropBadgeColor = () => {
    switch (drop.dropType) {
      case 'all_time_low':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'major_drop':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'significant_drop':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  const machineSlug = drop.machineName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const detailsUrl = `/products/${machineSlug}`;

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Price Drop Badge */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        <Badge className={cn('font-semibold', getDropBadgeColor())}>
          <TrendingDown className="w-3 h-3 mr-1" />
          {savingsPercentage.toFixed(0)}% OFF
        </Badge>
        {drop.isAllTimeLow && (
          <Badge className="bg-purple-600 text-white hover:bg-purple-700">
            <Award className="w-3 h-3 mr-1" />
            All Time Low
          </Badge>
        )}
      </div>

      {/* Affiliate Badge */}
      {drop.affiliateLink && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="text-xs">
            Affiliate
          </Badge>
        </div>
      )}

      {/* Image */}
      <Link href={detailsUrl} className="block aspect-square relative overflow-hidden bg-gray-50 dark:bg-gray-900">
        {drop.imageUrl ? (
          <Image
            src={drop.imageUrl}
            alt={drop.machineName}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-200"
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

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and Company */}
        <div>
          <Link href={detailsUrl} className="block">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-primary transition-colors">
              {drop.machineName}
            </h3>
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{drop.company}</p>
        </div>

        {/* Price Section */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <PriceTooltip machineId={drop.machineId} machineName={drop.machineName}>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${drop.currentPrice.toLocaleString()}
              </span>
            </PriceTooltip>
            <span className="text-sm text-gray-500 line-through">
              ${drop.previousPrice.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            Save ${savingsAmount.toLocaleString()}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>{formatDistanceToNow(new Date(drop.dropDate), { addSuffix: true })}</span>
        </div>

        {/* Work Area */}
        {drop.workArea && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Work Area: {drop.workArea}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            asChild
            size="sm"
            className="flex-1"
          >
            <Link href={drop.affiliateLink || drop.productLink} target="_blank" rel="noopener noreferrer">
              View Deal
            </Link>
          </Button>
          {onCompare && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCompare(drop.machineId)}
            >
              Compare
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}