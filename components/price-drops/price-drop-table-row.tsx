'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PriceTooltip } from '@/components/product/price-tooltip';
import { Award } from 'lucide-react';

interface PriceDropTableRowProps {
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

export function PriceDropTableRow({ drop }: PriceDropTableRowProps) {
  const savingsAmount = Math.abs(drop.priceChange);
  const savingsPercentage = Math.abs(drop.percentageChange);

  const machineSlug = drop.machineName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const detailsUrl = `/products/${machineSlug}`;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Product */}
      <td className="p-2">
        <div className="flex items-center gap-3">
          <Link href={detailsUrl} className="relative flex-shrink-0 w-12 h-12 rounded overflow-hidden">
            {drop.imageUrl ? (
              <div className="absolute inset-0 bg-white dark:bg-gray-800">
                <Image
                  src={drop.imageUrl}
                  alt={drop.machineName}
                  fill
                  className="object-contain p-1"
                  sizes="48px"
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </Link>
          <Link href={detailsUrl}>
            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {drop.machineName}
            </h3>
          </Link>
        </div>
      </td>

      {/* Current Price */}
      <td className="p-2">
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
          ${Math.round(drop.currentPrice).toLocaleString()}
        </span>
      </td>

      {/* Previous Price */}
      <td className="p-2">
        <span className="text-sm text-gray-500 line-through tabular-nums">
          ${Math.round(drop.previousPrice).toLocaleString()}
        </span>
      </td>

      {/* Savings */}
      <td className="p-2">
        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-0 font-semibold text-sm">
          ${Math.round(savingsAmount).toLocaleString()} Off
        </Badge>
      </td>

      {/* Discount */}
      <td className="p-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{savingsPercentage.toFixed(0)}%</span>
          {drop.isAllTimeLow && (
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs px-1.5 py-0.5">
              <Award className="w-3 h-3" />
            </Badge>
          )}
        </div>
      </td>

      {/* When */}
      <td className="p-2 text-sm text-gray-500">
        {formatDistanceToNow(new Date(drop.dropDate), { addSuffix: true })}
      </td>

      {/* Actions */}
      <td className="p-2">
        <div className="flex gap-1 justify-center">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 text-sm font-medium px-2"
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
              className="h-7 text-sm font-medium px-2"
            >
              History
            </Button>
          </PriceTooltip>
        </div>
      </td>
    </tr>
  );
}