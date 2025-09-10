'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Users, Monitor, Calendar, TrendingUp, HelpCircle, ArrowLeft, ArrowRight, Lock, Unlock } from 'lucide-react';
import { CalculatorState, CalculatedMetrics, MarketingState } from '../lib/calculator-types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  
  // Calculate total units needed from products tab
  const totalUnitsNeeded = Object.values(metrics.productMetrics || {}).reduce(
    (sum, product: any) => sum + (product.unitsProduced || 0), 0
  );

  // Average profit per unit for CAC warnings
  const avgProfitPerUnit = metrics.totalGrossProfit && totalUnitsNeeded > 0 
    ? metrics.totalGrossProfit / totalUnitsNeeded 
    : 0;

  // Lock state for each channel
  const [lockedChannels, setLockedChannels] = useState<{
    organic: boolean;
    digital: boolean;
    events: boolean;
  }>({
    organic: false,
    digital: false,
    events: false
  });

  // Initialize marketing state from parent state or use defaults
  const [salesDistribution, setSalesDistribution] = useState(() => {
    // Check if we have saved distribution in marketing state
    if (state.marketing && typeof state.marketing.organicPercentage === 'number') {
      // We have saved percentages, restore them
      const organic = state.marketing.organicPercentage;
      const digitalPercentage = (state.marketing as any).digitalPercentage || 0;
      const eventsPercentage = (state.marketing as any).eventsPercentage || 0;
      
      // If we have all three values saved, use them
      if (digitalPercentage !== undefined && eventsPercentage !== undefined) {
        return { 
          organic, 
          digital: digitalPercentage, 
          events: eventsPercentage 
        };
      }
      
      // Otherwise calculate from the organic percentage
      const remaining = 100 - organic;
      return { 
        organic, 
        digital: Math.round(remaining * 0.75), // Default 75% of non-organic to digital
        events: Math.round(remaining * 0.25)    // Default 25% of non-organic to events
      };
    }
    
    // Default for new calculators
    return {
      organic: 100,     // Start with 100% organic
      digital: 0,       // 0% from digital ads
      events: 0         // 0% from events
    };
  });

  // Digital advertising parameters - restore from state if available
  const [digitalParams, setDigitalParams] = useState(() => {
    const savedChannel = state.marketing?.digitalAdvertising?.channels?.[0];
    if (savedChannel?.costPerClick) {
      return {
        conversionRate: savedChannel.conversionRate || 5,
        costPerClick: savedChannel.costPerClick || 0.50
      };
    }
    return {
      conversionRate: 5,  // 5% conversion rate
      costPerClick: 0.50    // $0.50 per click
    };
  });

  // Input display states (what user sees while typing)
  const [conversionRateInput, setConversionRateInput] = useState(digitalParams.conversionRate.toString());
  const [costPerClickInput, setCostPerClickInput] = useState(digitalParams.costPerClick.toString());

  // Sync input states when params change externally
  useEffect(() => {
    setConversionRateInput(digitalParams.conversionRate.toString());
  }, [digitalParams.conversionRate]);

  useEffect(() => {
    setCostPerClickInput(digitalParams.costPerClick.toString());
  }, [digitalParams.costPerClick]);

  // Events parameters - restore from state if available
  const [eventParams, setEventParams] = useState(() => {
    const savedChannel = state.marketing?.eventsAndShows?.channels?.[0];
    if (savedChannel?.monthlyBudget !== undefined) {
      return {
        monthlyEventCost: savedChannel.monthlyBudget || 0,
        conversionRate: savedChannel.conversionRate || 10,
        averageEventAttendance: 200  // This isn't saved, use default
      };
    }
    return {
      monthlyEventCost: 0,      // Start with $0 for events
      conversionRate: 10,        // 10% conversion at events
      averageEventAttendance: 200  // Average people you interact with
    };
  });

  // Calculate units from each channel
  const unitsFromOrganic = Math.round((totalUnitsNeeded * salesDistribution.organic) / 100);
  const unitsFromDigital = Math.round((totalUnitsNeeded * salesDistribution.digital) / 100);
  const unitsFromEvents = Math.round((totalUnitsNeeded * salesDistribution.events) / 100);

  // Ensure units add up to total (handle rounding)
  const totalAllocated = unitsFromOrganic + unitsFromDigital + unitsFromEvents;
  const unitsAdjustment = totalUnitsNeeded - totalAllocated;
  const adjustedUnitsFromOrganic = unitsFromOrganic + unitsAdjustment;

  // Calculate digital ad spend required (working backwards)
  const clicksNeeded = digitalParams.conversionRate > 0 
    ? Math.ceil((unitsFromDigital * 100) / digitalParams.conversionRate)
    : 0;
  const digitalAdSpend = clicksNeeded * digitalParams.costPerClick;
  const digitalCAC = unitsFromDigital > 0 ? digitalAdSpend / unitsFromDigital : 0;

  // Calculate event metrics
  const eventVisitorsNeeded = eventParams.conversionRate > 0
    ? Math.ceil((unitsFromEvents * 100) / eventParams.conversionRate)
    : 0;
  const eventCAC = unitsFromEvents > 0 ? eventParams.monthlyEventCost / unitsFromEvents : 0;
  
  // Total marketing spend
  const totalMarketingSpend = digitalAdSpend + eventParams.monthlyEventCost;
  const blendedCAC = (unitsFromDigital + unitsFromEvents) > 0 
    ? totalMarketingSpend / (unitsFromDigital + unitsFromEvents)
    : 0;

  // Update parent state when values change
  useEffect(() => {
    onUpdateMarketing({
      organicUnitsPerMonth: adjustedUnitsFromOrganic,
      totalMonthlySpend: totalMarketingSpend,
      overallCAC: blendedCAC,
      totalUnitsFromMarketing: unitsFromDigital + unitsFromEvents,
      organicPercentage: salesDistribution.organic,
      digitalPercentage: salesDistribution.digital,
      eventsPercentage: salesDistribution.events,
      digitalAdvertising: {
        expanded: true,
        channels: [{
          id: 'unified-digital',
          name: 'Digital Advertising',
          monthlySpend: digitalAdSpend,
          monthlyBudget: digitalAdSpend, // Save for restoration
          conversionRate: digitalParams.conversionRate,
          costPerClick: digitalParams.costPerClick, // Save for restoration
          unitsPerMonth: unitsFromDigital,
          costPerUnit: digitalCAC,
          isActive: unitsFromDigital > 0
        }]
      },
      eventsAndShows: {
        expanded: true,
        channels: [{
          id: 'events',
          name: 'Events & Shows',
          monthlySpend: eventParams.monthlyEventCost,
          monthlyBudget: eventParams.monthlyEventCost, // Save for restoration
          monthlyAttendance: eventParams.averageEventAttendance,
          conversionRate: eventParams.conversionRate, // Use consistent field name
          salesRate: eventParams.conversionRate,
          unitsPerMonth: unitsFromEvents,
          costPerUnit: eventCAC,
          isActive: unitsFromEvents > 0
        }]
      }
    });
  }, [
    adjustedUnitsFromOrganic, 
    totalMarketingSpend, 
    blendedCAC, 
    unitsFromDigital, 
    unitsFromEvents,
    digitalAdSpend,
    digitalCAC,
    eventCAC,
    salesDistribution,
    digitalParams,
    eventParams,
    onUpdateMarketing
  ]);

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

  // Handle slider changes to ensure they always add to 100
  const handleSliderChange = (channel: 'organic' | 'digital' | 'events', value: number) => {
    const newDistribution = { ...salesDistribution };
    const oldValue = salesDistribution[channel];
    const diff = value - oldValue;
    
    newDistribution[channel] = value;
    
    // Get unlocked channels (excluding the current one)
    const unlockedChannels = [];
    if (channel !== 'organic' && !lockedChannels.organic) unlockedChannels.push('organic');
    if (channel !== 'digital' && !lockedChannels.digital) unlockedChannels.push('digital');
    if (channel !== 'events' && !lockedChannels.events) unlockedChannels.push('events');
    
    if (unlockedChannels.length === 0) {
      // All other channels are locked, can't change this one
      return;
    }
    
    // Calculate the total percentage of unlocked channels
    const unlockedTotal = unlockedChannels.reduce((sum, ch) => sum + salesDistribution[ch as keyof typeof salesDistribution], 0);
    
    // Distribute the difference among unlocked channels
    if (unlockedTotal > 0) {
      // Distribute proportionally
      unlockedChannels.forEach(ch => {
        const ratio = salesDistribution[ch as keyof typeof salesDistribution] / unlockedTotal;
        newDistribution[ch as keyof typeof salesDistribution] = Math.round(Math.max(0, Math.min(100, salesDistribution[ch as keyof typeof salesDistribution] - (diff * ratio))));
      });
    } else {
      // All unlocked channels are at 0, distribute evenly
      const perChannel = Math.round((100 - value - Object.keys(lockedChannels).filter(k => lockedChannels[k as keyof typeof lockedChannels] && k !== channel).reduce((sum, k) => sum + salesDistribution[k as keyof typeof salesDistribution], 0)) / unlockedChannels.length);
      unlockedChannels.forEach(ch => {
        newDistribution[ch as keyof typeof salesDistribution] = perChannel;
      });
    }
    
    // Final adjustment to ensure they sum to exactly 100
    const sum = newDistribution.organic + newDistribution.digital + newDistribution.events;
    if (sum !== 100) {
      // Find the first unlocked channel that's not the current one to adjust
      const adjustChannel = unlockedChannels[0];
      if (adjustChannel) {
        newDistribution[adjustChannel as keyof typeof salesDistribution] += 100 - sum;
      }
    }
    
    setSalesDistribution(newDistribution);
  };

  // Toggle lock state for a channel
  const toggleLock = (channel: 'organic' | 'digital' | 'events') => {
    // Count unlocked channels
    const unlockedCount = Object.values(lockedChannels).filter(locked => !locked).length;
    
    // Don't allow locking if it's the only unlocked channel
    if (!lockedChannels[channel] && unlockedCount <= 1) {
      return;
    }
    
    setLockedChannels(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };

  // Channel mix optimizer
  const suggestOptimalMix = () => {
    // Simple optimizer based on CAC efficiency
    const organicCAC = 0; // Free
    const currentDigitalCAC = digitalCAC;
    const currentEventCAC = eventCAC;
    
    // Suggest more organic if possible
    let suggestedOrganic = 50; // Aim for 50% organic
    let suggestedDigital = 30;
    let suggestedEvents = 20;
    
    // Adjust based on CAC efficiency
    if (currentEventCAC < currentDigitalCAC && currentEventCAC < avgProfitPerUnit * 0.3) {
      suggestedEvents = 30;
      suggestedDigital = 20;
    } else if (currentDigitalCAC < avgProfitPerUnit * 0.3) {
      suggestedDigital = 40;
      suggestedEvents = 10;
    }
    
    setSalesDistribution({
      organic: suggestedOrganic,
      digital: suggestedDigital,
      events: suggestedEvents
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monthly Sales Target</div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{totalUnitsNeeded}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">units</span>
        </div>
      </div>

      {/* Sales Distribution Card */}
      <Card className="border-0 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sales Channel Distribution</span>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Organic Sales Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <Label className="text-sm font-medium">Organic Sales</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Referrals, repeat customers, SEO, social media</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLock('organic')}
                    className="h-8 w-8 p-0"
                    disabled={!lockedChannels.organic && Object.values(lockedChannels).filter(v => !v).length <= 1}
                  >
                    {lockedChannels.organic ? (
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max={totalUnitsNeeded}
                    value={adjustedUnitsFromOrganic || ''}
                    onChange={(e) => {
                      if (lockedChannels.organic) return;
                      const value = e.target.value;
                      if (value === '') {
                        handleSliderChange('organic', 0);
                        return;
                      }
                      const units = parseInt(value) || 0;
                      const percentage = totalUnitsNeeded > 0 ? Math.round((units / totalUnitsNeeded) * 100) : 0;
                      handleSliderChange('organic', percentage);
                    }}
                    className="w-24 h-8 text-right font-bold"
                    disabled={lockedChannels.organic}
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">({salesDistribution.organic}%)</span>
                </div>
              </div>
              <Slider
                value={[salesDistribution.organic]}
                onValueChange={([value]) => !lockedChannels.organic && handleSliderChange('organic', value)}
                min={0}
                max={100}
                step={5}
                className="w-full"
                disabled={lockedChannels.organic}
              />
            </div>

            {/* Digital Advertising Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Digital Advertising</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Facebook, Instagram, Google, TikTok ads</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLock('digital')}
                    className="h-8 w-8 p-0"
                    disabled={!lockedChannels.digital && Object.values(lockedChannels).filter(v => !v).length <= 1}
                  >
                    {lockedChannels.digital ? (
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max={totalUnitsNeeded}
                    value={unitsFromDigital || ''}
                    onChange={(e) => {
                      if (lockedChannels.digital) return;
                      const value = e.target.value;
                      if (value === '') {
                        handleSliderChange('digital', 0);
                        return;
                      }
                      const units = parseInt(value) || 0;
                      const percentage = totalUnitsNeeded > 0 ? Math.round((units / totalUnitsNeeded) * 100) : 0;
                      handleSliderChange('digital', percentage);
                    }}
                    className="w-24 h-8 text-right font-bold"
                    disabled={lockedChannels.digital}
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">({salesDistribution.digital}%)</span>
                </div>
              </div>
              <Slider
                value={[salesDistribution.digital]}
                onValueChange={([value]) => !lockedChannels.digital && handleSliderChange('digital', value)}
                min={0}
                max={100}
                step={5}
                className="w-full"
                disabled={lockedChannels.digital}
              />
            </div>

            {/* Events & Shows Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Events & Shows</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Craft fairs, trade shows, pop-up markets</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLock('events')}
                    className="h-8 w-8 p-0"
                    disabled={!lockedChannels.events && Object.values(lockedChannels).filter(v => !v).length <= 1}
                  >
                    {lockedChannels.events ? (
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max={totalUnitsNeeded}
                    value={unitsFromEvents || ''}
                    onChange={(e) => {
                      if (lockedChannels.events) return;
                      const value = e.target.value;
                      if (value === '') {
                        handleSliderChange('events', 0);
                        return;
                      }
                      const units = parseInt(value) || 0;
                      const percentage = totalUnitsNeeded > 0 ? Math.round((units / totalUnitsNeeded) * 100) : 0;
                      handleSliderChange('events', percentage);
                    }}
                    className="w-24 h-8 text-right font-bold"
                    disabled={lockedChannels.events}
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">({salesDistribution.events}%)</span>
                </div>
              </div>
              <Slider
                value={[salesDistribution.events]}
                onValueChange={([value]) => !lockedChannels.events && handleSliderChange('events', value)}
                min={0}
                max={100}
                step={5}
                className="w-full"
                disabled={lockedChannels.events}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organic Sales (Read-only) */}
      {adjustedUnitsFromOrganic > 0 && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="bg-muted/50 px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-base font-medium text-foreground">Organic Sales</span>
                  <span className="text-xs text-green-600 bg-green-600/10 px-2 py-1 rounded font-medium">FREE</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Monthly Units</div>
                  <div className="text-lg font-bold text-green-600">{adjustedUnitsFromOrganic}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Digital Advertising (Calculated) */}
      {unitsFromDigital > 0 && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="bg-muted/50 px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="text-base font-medium text-foreground">Digital Advertising</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Required Ad Spend</div>
                  <div className="text-lg font-bold text-foreground">{formatCurrency(digitalAdSpend)}/mo</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Conversion Rate</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={conversionRateInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow any input while typing
                        setConversionRateInput(value);
                        
                        // Try to parse and update actual value
                        const parsed = parseFloat(value);
                        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                          setDigitalParams({
                            ...digitalParams,
                            conversionRate: parsed
                          });
                        }
                      }}
                      onBlur={() => {
                        // Clean up on blur
                        const parsed = parseFloat(conversionRateInput);
                        if (isNaN(parsed) || parsed <= 0) {
                          setDigitalParams({ ...digitalParams, conversionRate: 5 });
                          setConversionRateInput('5');
                        } else {
                          const rounded = Math.round(parsed * 100) / 100;
                          setDigitalParams({ ...digitalParams, conversionRate: rounded });
                          setConversionRateInput(rounded.toString());
                        }
                      }}
                      className="h-8 w-20 px-2 rounded-md border border-input bg-background text-sm"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cost Per Click</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <input
                      type="text"
                      value={costPerClickInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow any input while typing
                        setCostPerClickInput(value);
                        
                        // Try to parse and update actual value
                        const parsed = parseFloat(value);
                        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1000) {
                          setDigitalParams({
                            ...digitalParams,
                            costPerClick: parsed
                          });
                        }
                      }}
                      onBlur={() => {
                        // Clean up on blur
                        const parsed = parseFloat(costPerClickInput);
                        if (isNaN(parsed) || parsed <= 0) {
                          setDigitalParams({ ...digitalParams, costPerClick: 0.50 });
                          setCostPerClickInput('0.5');
                        } else {
                          const rounded = Math.round(parsed * 100) / 100;
                          setDigitalParams({ ...digitalParams, costPerClick: rounded });
                          setCostPerClickInput(rounded.toString());
                        }
                      }}
                      className="h-8 pl-5 pr-2 rounded-md border border-input bg-background text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Clicks Needed</Label>
                  <div className="h-8 px-2 flex items-center text-sm font-mono font-medium rounded-md border bg-muted">
                    {clicksNeeded.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cost/Acquisition</Label>
                  <div className="h-8 px-2 flex items-center text-sm font-mono font-medium rounded-md border bg-muted">
                    {formatCurrencyPrecise(digitalCAC)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events & Shows (Fixed Cost) */}
      {unitsFromEvents > 0 && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="bg-muted/50 px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-base font-medium text-foreground">Events & Shows</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Monthly Investment</div>
                  <div className="text-lg font-bold text-foreground">{formatCurrency(eventParams.monthlyEventCost)}</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Event Costs</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={eventParams.monthlyEventCost}
                      onChange={(e) => setEventParams({
                        ...eventParams,
                        monthlyEventCost: parseInt(e.target.value) || 0
                      })}
                      className="h-8 pl-5"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Booth Traffic</Label>
                  <Input
                    type="number"
                    min="10"
                    max="5000"
                    step="50"
                    value={eventParams.averageEventAttendance}
                    onChange={(e) => setEventParams({
                      ...eventParams,
                      averageEventAttendance: parseInt(e.target.value) || 0
                    })}
                    className="h-8"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Conversion</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={eventParams.conversionRate}
                      onChange={(e) => setEventParams({
                        ...eventParams,
                        conversionRate: parseFloat(e.target.value) || 0
                      })}
                      className="h-8 w-16"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Visitors Needed</Label>
                  <div className="h-8 px-2 flex items-center text-sm font-mono font-medium rounded-md border bg-muted">
                    {eventVisitorsNeeded}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cost per Sale</Label>
                  <div className="h-8 px-2 flex items-center text-sm font-mono font-medium rounded-md border bg-muted">
                    {formatCurrencyPrecise(eventCAC)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Marketing Summary */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-base font-medium text-foreground">Marketing Summary</span>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Channel breakdown with percentages and values */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Organic Sales</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{salesDistribution.organic}%</span>
                  <span className="font-mono font-medium text-sm">{adjustedUnitsFromOrganic} units</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Digital Advertising</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{salesDistribution.digital}%</span>
                  <span className="font-mono font-medium text-sm">{formatCurrency(digitalAdSpend)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Events & Shows</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{salesDistribution.events}%</span>
                  <span className="font-mono font-medium text-sm">{formatCurrency(eventParams.monthlyEventCost)}</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Total Marketing Spend */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Marketing Spend</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(totalMarketingSpend)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Blended CAC</span>
                <span className="font-mono text-muted-foreground">
                  {unitsFromDigital + unitsFromEvents > 0 
                    ? formatCurrencyPrecise(blendedCAC) 
                    : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Units/Month</span>
                <span className="font-mono text-muted-foreground">{totalUnitsNeeded}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}