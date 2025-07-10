import { Badge } from '@/components/ui/badge';
import { TrendingDown, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceDropBadgeProps {
  percentageChange: number;
  isAllTimeLow?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PriceDropBadge({ 
  percentageChange, 
  isAllTimeLow = false,
  size = 'md',
  className 
}: PriceDropBadgeProps) {
  const percentage = Math.abs(percentageChange);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  if (isAllTimeLow) {
    return (
      <Badge 
        className={cn(
          'bg-purple-600 text-white hover:bg-purple-700',
          sizeClasses[size],
          className
        )}
      >
        <Award className={cn(iconSizes[size], 'mr-1')} />
        All Time Low
      </Badge>
    );
  }

  const getBadgeColor = () => {
    if (percentage >= 20) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (percentage >= 10) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  return (
    <Badge 
      className={cn(
        'font-semibold',
        getBadgeColor(),
        sizeClasses[size],
        className
      )}
    >
      <TrendingDown className={cn(iconSizes[size], 'mr-1')} />
      {percentage.toFixed(0)}% OFF
    </Badge>
  );
}