'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangeFilterProps {
  onDateChange?: (startDate: string | null, endDate: string | null) => void;
}

export function DateRangeFilter({ onDateChange }: DateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  // Get current year and quarter
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;

  // Generate period options
  const periodOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'ytd', label: `Year to Date (${currentYear})` },
    { value: 'last-year', label: `Last Year (${currentYear - 1})` },
    { value: `${currentYear}-q1`, label: `Q1 ${currentYear}` },
    { value: `${currentYear}-q2`, label: `Q2 ${currentYear}` },
    { value: `${currentYear}-q3`, label: `Q3 ${currentYear}` },
    { value: `${currentYear}-q4`, label: `Q4 ${currentYear}` },
    { value: `${currentYear - 1}-q1`, label: `Q1 ${currentYear - 1}` },
    { value: `${currentYear - 1}-q2`, label: `Q2 ${currentYear - 1}` },
    { value: `${currentYear - 1}-q3`, label: `Q3 ${currentYear - 1}` },
    { value: `${currentYear - 1}-q4`, label: `Q4 ${currentYear - 1}` },
    { value: 'last-30', label: 'Last 30 Days' },
    { value: 'last-90', label: 'Last 90 Days' },
  ];

  // Calculate date range based on period
  const getDateRange = (period: string): { start: string | null; end: string | null } => {
    const today = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (period) {
      case 'all':
        return { start: null, end: null };
      
      case 'ytd':
        start = new Date(currentYear, 0, 1);
        end = today;
        break;
      
      case 'last-year':
        start = new Date(currentYear - 1, 0, 1);
        end = new Date(currentYear - 1, 11, 31);
        break;
      
      case 'last-30':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = today;
        break;
      
      case 'last-90':
        start = new Date(today);
        start.setDate(today.getDate() - 90);
        end = today;
        break;
      
      default:
        // Handle quarter periods (e.g., "2025-q1")
        const [year, quarter] = period.split('-');
        if (year && quarter?.startsWith('q')) {
          const yearNum = parseInt(year);
          const quarterNum = parseInt(quarter.substring(1));
          const quarterStart = (quarterNum - 1) * 3;
          start = new Date(yearNum, quarterStart, 1);
          end = new Date(yearNum, quarterStart + 3, 0); // Last day of quarter
        }
        break;
    }

    return {
      start: start ? start.toISOString().split('T')[0] : null,
      end: end ? end.toISOString().split('T')[0] : null,
    };
  };

  // Initialize from URL params
  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    if (!from && !to) {
      setSelectedPeriod('all');
    } else {
      // Try to match with predefined periods
      const matchingPeriod = periodOptions.find(option => {
        const range = getDateRange(option.value);
        return range.start === from && range.end === to;
      });
      
      if (matchingPeriod) {
        setSelectedPeriod(matchingPeriod.value);
      } else {
        setSelectedPeriod('custom');
      }
    }
  }, [searchParams]);

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    const { start, end } = getDateRange(value);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (start && end) {
      params.set('from', start);
      params.set('to', end);
    } else {
      params.delete('from');
      params.delete('to');
    }
    
    router.push(`?${params.toString()}`);
    
    // Notify parent component
    if (onDateChange) {
      onDateChange(start, end);
    }
  };

  const formatDateRange = () => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    if (!from && !to) {
      return 'All time data';
    }
    
    if (from && to) {
      const startDate = new Date(from).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const endDate = new Date(to).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `${startDate} - ${endDate}`;
    }
    
    return 'Custom date range';
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Period:</span>
            </div>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDateRange()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}