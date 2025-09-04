'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, AlertTriangle, Users, TrendingUp, X, Monitor, Calendar, Plus } from 'lucide-react';
import { CalculatorState, CalculatedMetrics, MarketingChannel, MarketingState, EventChannel } from '../lib/calculator-types';

// Digital advertising typical sales rates: 2-6% for most platforms
const DIGITAL_CHANNEL_PRESETS = [
  { name: 'Facebook/Instagram Ads', conversionRate: 2.5 },
  { name: 'Google Ads', conversionRate: 3.5 },
  { name: 'Pinterest Ads', conversionRate: 2.0 },
  { name: 'TikTok Ads', conversionRate: 1.8 },
  { name: 'YouTube Ads', conversionRate: 2.2 },
  { name: 'LinkedIn Ads', conversionRate: 4.0 },
  { name: 'Email Marketing', conversionRate: 5.0 },
  { name: 'Influencer Marketing', conversionRate: 3.0 },
  { name: 'Custom Digital Channel', conversionRate: 2.0 }
];

const EVENT_CHANNEL_PRESETS = [
  { name: 'Local Craft Shows', salesRate: 3, typicalAttendance: 500 },
  { name: 'Maker Faires', salesRate: 2, typicalAttendance: 1200 },
  { name: 'Trade Shows', salesRate: 5, typicalAttendance: 800 },
  { name: 'Pop-up Markets', salesRate: 4, typicalAttendance: 300 },
  { name: 'Art Festivals', salesRate: 3, typicalAttendance: 600 },
  { name: 'Farmers Markets', salesRate: 4, typicalAttendance: 400 },
  { name: 'Holiday Markets', salesRate: 5, typicalAttendance: 700 },
  { name: 'Custom Event', salesRate: 3, typicalAttendance: 500 }
];

interface Level3MarketingProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onUpdateMarketing: (updates: Partial<MarketingState>) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function Level3Marketing({ 
  state, 
  metrics, 
  onUpdateMarketing,
  onComplete, 
  onBack 
}: Level3MarketingProps) {
  // Calculate total units needed
  const totalUnitsNeeded = Object.values(metrics.productMetrics || {}).reduce(
    (sum, product: any) => sum + (product.unitsProduced || 0), 0
  );

  // Initialize marketing state - Always start with all units as organic
  const [marketingState, setMarketingState] = useState<MarketingState>(() => {
    const defaultState = {
      organicUnitsPerMonth: totalUnitsNeeded, // Always start with total units needed
      digitalAdvertising: { 
        expanded: false, 
        channels: [
          {
            id: 'facebook-ads',
            name: 'Facebook/Instagram',
            monthlySpend: 0,
            conversionRate: 2.5,
            unitsPerMonth: 0,
            costPerUnit: 0,
            isActive: false
          }
        ]
      },
      eventsAndShows: { 
        expanded: false, 
        channels: [
          {
            id: 'craft-shows',
            name: 'Craft Shows',
            monthlySpend: 0,
            monthlyAttendance: 500,
            salesRate: 3,
            unitsPerMonth: 0,
            costPerUnit: 0,
            isActive: false
          }
        ]
      }
    };

    // If no marketing state exists, use defaults
    if (!state.marketing) {
      return defaultState;
    }

    // Handle migration from old structure
    if ('channels' in state.marketing && Array.isArray(state.marketing.channels)) {
      const oldChannels = state.marketing.channels || [];
      const digitalChannels = oldChannels.filter(c => 
        c.name.toLowerCase().includes('facebook') || 
        c.name.toLowerCase().includes('google') ||
        c.name.toLowerCase().includes('instagram') ||
        c.name.toLowerCase().includes('digital')
      );
      const eventChannels = oldChannels.filter(c => 
        c.name.toLowerCase().includes('craft') || 
        c.name.toLowerCase().includes('show') ||
        c.name.toLowerCase().includes('event') ||
        c.name.toLowerCase().includes('faire')
      );
      
      return {
        organicUnitsPerMonth: totalUnitsNeeded, // Reset to total units needed
        digitalAdvertising: { 
          expanded: false, 
          channels: digitalChannels.length > 0 ? digitalChannels.map(c => ({...c, monthlySpend: 0, unitsPerMonth: 0})) : defaultState.digitalAdvertising.channels
        },
        eventsAndShows: { 
          expanded: false, 
          channels: eventChannels.length > 0 ? eventChannels.map(c => ({
            ...c, 
            monthlySpend: 0, 
            unitsPerMonth: 0,
            monthlyAttendance: c.monthlyAttendance || 500,
            salesRate: c.salesRate || c.conversionRate || 3
          })) : defaultState.eventsAndShows.channels
        }
      };
    }

    // For existing new structure, reset organic to total units and clear paid channels
    return {
      organicUnitsPerMonth: totalUnitsNeeded,
      digitalAdvertising: {
        ...state.marketing.digitalAdvertising,
        channels: (state.marketing.digitalAdvertising?.channels || []).map(c => ({...c, monthlySpend: 0, unitsPerMonth: 0}))
      },
      eventsAndShows: {
        ...state.marketing.eventsAndShows,
        channels: (state.marketing.eventsAndShows?.channels || []).map(c => ({
          ...c, 
          monthlySpend: 0, 
          unitsPerMonth: 0,
          monthlyAttendance: c.monthlyAttendance || 500,
          salesRate: c.salesRate || c.conversionRate || 3
        }))
      }
    };
  });

  // Ensure organic units match total units needed when there are no paid units
  useEffect(() => {
    if (totalPaidUnits === 0 && marketingState.organicUnitsPerMonth !== totalUnitsNeeded) {
      setMarketingState(prev => ({
        ...prev,
        organicUnitsPerMonth: totalUnitsNeeded
      }));
    }
  }, [totalUnitsNeeded]); // Run when total units needed changes

  // Helper function to update digital channel calculations
  const calculateChannelMetrics = (channel: MarketingChannel) => {
    // Only calculate if monthlySpend > 0
    if (channel.monthlySpend <= 0) {
      return { ...channel, unitsPerMonth: 0, costPerUnit: 0 };
    }
    
    const estimatedReach = channel.monthlySpend * 10; // $1 = ~10 people reached
    const conversions = (estimatedReach * channel.conversionRate) / 100;
    const cac = conversions > 0 ? channel.monthlySpend / conversions : 0;
    
    return {
      ...channel,
      unitsPerMonth: Math.floor(conversions),
      costPerUnit: Math.round(cac * 100) / 100
    };
  };

  // Helper function to update event channel calculations
  const calculateEventChannelMetrics = (channel: EventChannel) => {
    // Only calculate if both attendance and spend > 0
    if (channel.monthlyAttendance <= 0 || channel.monthlySpend <= 0) {
      return { ...channel, unitsPerMonth: 0, costPerUnit: 0 };
    }
    
    const conversions = (channel.monthlyAttendance * channel.salesRate) / 100;
    const costPerSale = conversions > 0 ? channel.monthlySpend / conversions : 0;
    
    return {
      ...channel,
      unitsPerMonth: Math.floor(conversions),
      costPerUnit: Math.round(costPerSale * 100) / 100
    };
  };

  // Calculate totals across all categories
  const getAllActiveChannels = () => {
    const digitalChannels = (marketingState.digitalAdvertising?.channels || []).map(calculateChannelMetrics);
    const eventChannels = (marketingState.eventsAndShows?.channels || []).map(calculateEventChannelMetrics);
    return [...digitalChannels, ...eventChannels].filter(c => c.monthlySpend > 0);
  };

  const activeChannels = getAllActiveChannels();
  const totalMarketingSpend = activeChannels.reduce((sum, c) => sum + c.monthlySpend, 0);
  const paidUnitsNeeded = Math.max(0, totalUnitsNeeded - marketingState.organicUnitsPerMonth);
  const totalPaidUnits = activeChannels.reduce((sum, c) => sum + c.unitsPerMonth, 0);
  const blendedCAC = totalPaidUnits > 0 ? totalMarketingSpend / totalPaidUnits : 0;

  // Auto-balance organic sales when paid units change
  useEffect(() => {
    if (totalPaidUnits > 0) {
      const idealOrganic = Math.max(0, totalUnitsNeeded - totalPaidUnits);
      if (marketingState.organicUnitsPerMonth !== idealOrganic) {
        setMarketingState(prev => ({
          ...prev,
          organicUnitsPerMonth: idealOrganic
        }));
      }
    }
  }, [totalPaidUnits, totalUnitsNeeded]);

  // Update parent state when local state changes
  useEffect(() => {
    onUpdateMarketing({
      ...marketingState,
      totalMonthlySpend: totalMarketingSpend,
      overallCAC: blendedCAC,
      totalUnitsFromMarketing: totalPaidUnits,
      organicPercentage: totalUnitsNeeded > 0 ? (marketingState.organicUnitsPerMonth / totalUnitsNeeded) * 100 : 0
    });
  }, [marketingState, totalMarketingSpend, blendedCAC, totalPaidUnits, totalUnitsNeeded, onUpdateMarketing]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  const formatCurrencyPrecise = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  // Helper functions to update marketing state
  const updateDigitalChannel = (channelId: string, updates: Partial<MarketingChannel>) => {
    setMarketingState(prev => ({
      ...prev,
      digitalAdvertising: {
        ...prev.digitalAdvertising,
        channels: prev.digitalAdvertising.channels.map(c =>
          c.id === channelId ? { ...c, ...updates } : c
        )
      }
    }));
  };

  const updateEventChannel = (channelId: string, updates: Partial<EventChannel>) => {
    setMarketingState(prev => ({
      ...prev,
      eventsAndShows: {
        ...prev.eventsAndShows,
        channels: prev.eventsAndShows.channels.map(c =>
          c.id === channelId ? { ...c, ...updates } : c
        )
      }
    }));
  };

  const addDigitalChannel = (channelPreset: { name: string; conversionRate: number }) => {
    const newChannel: MarketingChannel = {
      id: `digital-${Date.now()}`,
      name: channelPreset.name,
      monthlySpend: 0,
      conversionRate: channelPreset.conversionRate,
      unitsPerMonth: 0,
      costPerUnit: 0,
      isActive: true
    };
    setMarketingState(prev => ({
      ...prev,
      digitalAdvertising: {
        ...prev.digitalAdvertising,
        channels: [...prev.digitalAdvertising.channels, newChannel]
      }
    }));
  };

  const addEventChannel = (channelPreset: { name: string; salesRate: number; typicalAttendance: number }) => {
    const newChannel: EventChannel = {
      id: `event-${Date.now()}`,
      name: channelPreset.name,
      monthlySpend: 0,
      monthlyAttendance: channelPreset.typicalAttendance,
      salesRate: channelPreset.salesRate,
      unitsPerMonth: 0,
      costPerUnit: 0,
      isActive: true
    };
    setMarketingState(prev => ({
      ...prev,
      eventsAndShows: {
        ...prev.eventsAndShows,
        channels: [...prev.eventsAndShows.channels, newChannel]
      }
    }));
  };

  const removeDigitalChannel = (channelId: string) => {
    setMarketingState(prev => ({
      ...prev,
      digitalAdvertising: {
        ...prev.digitalAdvertising,
        channels: prev.digitalAdvertising.channels.filter(c => c.id !== channelId)
      }
    }));
  };

  const removeEventChannel = (channelId: string) => {
    setMarketingState(prev => ({
      ...prev,
      eventsAndShows: {
        ...prev.eventsAndShows,
        channels: prev.eventsAndShows.channels.filter(c => c.id !== channelId)
      }
    }));
  };

  const toggleDigitalExpanded = () => {
    setMarketingState(prev => ({
      ...prev,
      digitalAdvertising: {
        ...prev.digitalAdvertising,
        expanded: !prev.digitalAdvertising.expanded
      }
    }));
  };

  const toggleEventsExpanded = () => {
    setMarketingState(prev => ({
      ...prev,
      eventsAndShows: {
        ...prev.eventsAndShows,
        expanded: !prev.eventsAndShows.expanded
      }
    }));
  };

  const shortfall = Math.max(0, paidUnitsNeeded - totalPaidUnits);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Marketing Channels</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Total Monthly Spend</span>
          <span className="text-lg font-bold text-destructive">{formatCurrency(totalMarketingSpend)}</span>
        </div>
      </div>


      {/* Organic Sales */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-base font-medium text-foreground">Organic Sales</span>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded font-medium">Free</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Referrals, repeat customers, organic social</div>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-4 gap-4 items-center">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Units/Month</Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={marketingState.organicUnitsPerMonth || ''}
                  onChange={(e) => setMarketingState(prev => ({
                    ...prev,
                    organicUnitsPerMonth: e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                  }))}
                />
              </div>
              
              <div className="text-center">
                <div className={`text-base font-medium ${
                  (() => {
                    const totalUnits = totalPaidUnits + marketingState.organicUnitsPerMonth;
                    const shortfall = totalUnitsNeeded - totalUnits;
                    return shortfall <= 0 ? 'text-green-600' : 'text-foreground';
                  })()
                }`}>
                  {(() => {
                    const totalUnits = totalPaidUnits + marketingState.organicUnitsPerMonth;
                    const shortfall = totalUnitsNeeded - totalUnits;
                    return shortfall <= 0 ? 'Goal met!' : `Need ${shortfall} more units`;
                  })()}
                </div>
              </div>
              
              <div></div>
              
              <div className="text-right">
                <div className="text-lg font-medium text-green-600">{marketingState.organicUnitsPerMonth} units</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Digital Advertising Section */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <Button
            variant="ghost"
            onClick={toggleDigitalExpanded}
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="bg-muted/50 px-6 py-4 border-b border-border w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="text-base font-medium text-foreground">Digital Advertising</span>
                  <span className="text-xs text-muted-foreground">(Typical sales rates: 2-6%)</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    {formatCurrency((marketingState.digitalAdvertising?.channels || []).reduce((sum, c) => 
                      sum + (c.monthlySpend || 0), 0
                    ))} total
                  </div>
                </div>
              </div>
            </div>
          </Button>

          {marketingState.digitalAdvertising?.expanded && (
            <div className="p-6 space-y-3">
              {(marketingState.digitalAdvertising?.channels || []).map(channel => {
              const calculatedChannel = calculateChannelMetrics(channel);
              return (
                <div key={channel.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Input
                      value={channel.name}
                      onChange={(e) => updateDigitalChannel(channel.id, { name: e.target.value })}
                      className="font-medium h-8 text-sm flex-1 max-w-48"
                      placeholder="Channel name"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDigitalChannel(channel.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <Label className="text-xs font-medium">Monthly Spend</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="50"
                          value={channel.monthlySpend || ''}
                          onChange={(e) => updateDigitalChannel(channel.id, { monthlySpend: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                          className="pl-5 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Sales Rate</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0.1"
                          max="20"
                          step="0.1"
                          value={channel.conversionRate || ''}
                          onChange={(e) => updateDigitalChannel(channel.id, { conversionRate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                          className="pr-5 h-8 text-sm"
                          placeholder="2.5"
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Units/Month</Label>
                      <div className="h-8 px-2 flex items-center text-sm font-medium rounded-md border bg-muted">
                        {calculatedChannel.unitsPerMonth}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium" title="Customer Acquisition Cost">CAC</Label>
                      <div className="h-8 px-2 flex items-center text-sm font-medium rounded-md border bg-muted">
                        {formatCurrencyPrecise(calculatedChannel.costPerUnit)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
              <Select onValueChange={(value) => {
                const preset = DIGITAL_CHANNEL_PRESETS.find(p => p.name === value);
                if (preset) addDigitalChannel(preset);
              }}>
                <SelectTrigger className="w-full h-8 text-sm">
                  <SelectValue placeholder="+ Add Digital Channel" />
                </SelectTrigger>
                <SelectContent>
                  {DIGITAL_CHANNEL_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      <div className="flex justify-between items-center w-full">
                        <span>{preset.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{preset.conversionRate}% sales</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events & Shows Section */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <Button
            variant="ghost"
            onClick={toggleEventsExpanded}
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="bg-muted/50 px-6 py-4 border-b border-border w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-base font-medium text-foreground">Events & Shows</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    {formatCurrency((marketingState.eventsAndShows?.channels || []).reduce((sum, c) => 
                      sum + (c.monthlySpend || 0), 0
                    ))} total
                  </div>
                </div>
              </div>
            </div>
          </Button>

          {marketingState.eventsAndShows?.expanded && (
            <div className="p-6 space-y-3">
              {(marketingState.eventsAndShows?.channels || []).map(channel => {
              const calculatedChannel = calculateEventChannelMetrics(channel);
              return (
                <div key={channel.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Input
                      value={channel.name}
                      onChange={(e) => updateEventChannel(channel.id, { name: e.target.value })}
                      className="font-medium h-8 text-sm flex-1 max-w-48"
                      placeholder="Event name"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEventChannel(channel.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-3 text-sm">
                    <div>
                      <Label className="text-xs font-medium">Monthly Costs</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="25"
                          value={channel.monthlySpend || ''}
                          onChange={(e) => updateEventChannel(channel.id, { monthlySpend: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                          className="pl-5 h-8 text-sm"
                          placeholder="100"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Attendance</Label>
                      <Input
                        type="number"
                        min="0"
                        step="50"
                        value={channel.monthlyAttendance || ''}
                        onChange={(e) => updateEventChannel(channel.id, { monthlyAttendance: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                        className="h-8 text-sm"
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Sales Rate</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0.1"
                          max="20"
                          step="0.1"
                          value={channel.salesRate || ''}
                          onChange={(e) => updateEventChannel(channel.id, { salesRate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                          className="pr-5 h-8 text-sm"
                          placeholder="3"
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Sales</Label>
                      <div className="h-8 px-2 flex items-center text-sm font-medium rounded-md border bg-muted">
                        {calculatedChannel.unitsPerMonth}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Cost/Sale</Label>
                      <div className="h-8 px-2 flex items-center text-sm font-medium rounded-md border bg-muted">
                        {formatCurrencyPrecise(calculatedChannel.costPerUnit)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
              <Select onValueChange={(value) => {
                const preset = EVENT_CHANNEL_PRESETS.find(p => p.name === value);
                if (preset) addEventChannel(preset);
              }}>
                <SelectTrigger className="w-full h-8 text-sm">
                  <SelectValue placeholder="+ Add Event/Show" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CHANNEL_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      <div className="flex justify-between items-center w-full">
                        <span>{preset.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{preset.salesRate}% of {preset.typicalAttendance} people</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketing Summary */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-base font-medium text-foreground">Marketing Summary</span>
            </div>
          </div>
          
          <div className="p-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Monthly Spend</span>
              <span className="font-mono font-medium text-destructive">{formatCurrency(totalMarketingSpend)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground" title="Customer Acquisition Cost">Blended CAC</span>
              <span className="font-mono font-medium">{formatCurrencyPrecise(blendedCAC)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organic Units</span>
              <span className="font-mono font-medium text-green-600">{marketingState.organicUnitsPerMonth}/month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Units</span>
              <span className="font-mono font-medium">{totalPaidUnits}/month</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Units</span>
                <span className="font-mono font-medium">{marketingState.organicUnitsPerMonth + totalPaidUnits}/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Target Needed</span>
                <span className="font-mono font-medium">{totalUnitsNeeded}/month</span>
              </div>
              
              {shortfall > 0 && (
                <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 mt-2">
                  <span className="font-medium">Shortfall</span>
                  <span className="font-mono font-medium">-{shortfall} units</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}