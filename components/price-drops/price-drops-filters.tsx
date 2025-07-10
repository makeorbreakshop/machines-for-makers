'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface PriceDropsFiltersProps {
  filters: {
    category: string;
    minDiscount: string;
    days: string;
    sortBy: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
}

export function PriceDropsFilters({ filters, onFilterChange, onReset }: PriceDropsFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Machine Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Machine Type</Label>
        <Select value={filters.category} onValueChange={(value) => onFilterChange('category', value)}>
          <SelectTrigger id="category">
            <SelectValue placeholder="All Machines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Machines</SelectItem>
            <SelectItem value="laser">Laser Cutters</SelectItem>
            <SelectItem value="3d-printer">3D Printers</SelectItem>
            <SelectItem value="cnc">CNC Machines</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Minimum Discount */}
      <div className="space-y-2">
        <Label>Minimum Discount</Label>
        <RadioGroup value={filters.minDiscount} onValueChange={(value) => onFilterChange('minDiscount', value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="0" id="discount-all" />
            <Label htmlFor="discount-all" className="font-normal">All Discounts</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="10" id="discount-10" />
            <Label htmlFor="discount-10" className="font-normal">10% or more</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="20" id="discount-20" />
            <Label htmlFor="discount-20" className="font-normal">20% or more</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="30" id="discount-30" />
            <Label htmlFor="discount-30" className="font-normal">30% or more</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Time Period */}
      <div className="space-y-2">
        <Label htmlFor="days">Time Period</Label>
        <Select value={filters.days} onValueChange={(value) => onFilterChange('days', value)}>
          <SelectTrigger id="days">
            <SelectValue placeholder="Last 7 days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="3">Last 3 days</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <Label htmlFor="sort">Sort By</Label>
        <Select value={filters.sortBy} onValueChange={(value) => onFilterChange('sortBy', value)}>
          <SelectTrigger id="sort">
            <SelectValue placeholder="Most Recent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="percentage">Biggest % Drop</SelectItem>
            <SelectItem value="amount">Biggest $ Savings</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reset Button */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onReset}
        className="w-full"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset Filters
      </Button>
    </div>
  );
}