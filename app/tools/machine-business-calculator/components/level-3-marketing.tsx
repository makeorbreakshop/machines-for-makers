'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, ArrowLeft, AlertTriangle, Users, TrendingUp, X } from 'lucide-react';
import { CalculatorState, CalculatedMetrics, MarketingChannel, DEFAULT_MARKETING_CHANNELS } from '../lib/calculator-types';

interface Level3MarketingProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onUpdateMarketing: (updates: Partial<CalculatorState['marketing']>) => void;
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
  const [channels, setChannels] = useState<MarketingChannel[]>(
    state.marketing?.channels || DEFAULT_MARKETING_CHANNELS
  );
  const [organicUnits, setOrganicUnits] = useState(state.marketing?.organicUnitsPerMonth || 10);

  // Calculate total units needed
  const totalUnitsNeeded = Object.values(metrics.productMetrics || {}).reduce(
    (sum, product: any) => sum + (product.unitsProduced || 0), 0
  );

  // Calculate marketing metrics
  const activeChannels = channels.filter(c => c.isActive);
  const totalMarketingSpend = activeChannels.reduce((sum, c) => sum + c.monthlySpend, 0);
  const paidUnitsNeeded = Math.max(0, totalUnitsNeeded - organicUnits);
  const totalPaidUnits = activeChannels.reduce((sum, c) => sum + c.unitsPerMonth, 0);
  const blendedCAC = totalPaidUnits > 0 ? totalMarketingSpend / totalPaidUnits : 0;
  
  // Update channel calculations
  useEffect(() => {
    const updatedChannels = channels.map(channel => {
      if (!channel.isActive) {
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
    });
    
    if (JSON.stringify(updatedChannels) !== JSON.stringify(channels)) {
      setChannels(updatedChannels);
    }
  }, [channels]);

  // Update parent state
  useEffect(() => {
    onUpdateMarketing({
      channels,
      totalMonthlySpend: totalMarketingSpend,
      organicUnitsPerMonth: organicUnits,
      overallCAC: blendedCAC,
      totalUnitsFromMarketing: totalPaidUnits,
      organicPercentage: (organicUnits / totalUnitsNeeded) * 100
    });
  }, [channels, organicUnits, totalMarketingSpend, blendedCAC, totalPaidUnits, totalUnitsNeeded, onUpdateMarketing]);

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

  const updateChannel = (channelId: string, updates: Partial<MarketingChannel>) => {
    setChannels(prev => prev.map(c => 
      c.id === channelId ? { ...c, ...updates } : c
    ));
  };

  const addCustomChannel = () => {
    const newChannel: MarketingChannel = {
      id: `custom-${Date.now()}`,
      name: 'Custom Channel',
      monthlySpend: 100,
      conversionRate: 5,
      unitsPerMonth: 0,
      costPerUnit: 0,
      isActive: false
    };
    setChannels(prev => [...prev, newChannel]);
  };

  const removeChannel = (channelId: string) => {
    setChannels(prev => prev.filter(c => c.id !== channelId));
  };

  const shortfall = Math.max(0, paidUnitsNeeded - totalPaidUnits);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Marketing Channels</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Total Monthly Spend</span>
          <span className="text-lg font-bold text-red-600">{formatCurrency(totalMarketingSpend)}</span>
        </div>
      </div>

      {/* The Reality Check */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800">
                You need <strong>{totalUnitsNeeded} units/month</strong> to hit your goal. 
                Even with {organicUnits} organic sales, you still need <strong>{paidUnitsNeeded} paid customers</strong> monthly.
                Marketing spend is a real cost line in your budget.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organic Sales - Styled like product cards */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="font-medium">Organic Sales</span>
            </div>
            <span className="text-sm text-green-600 font-medium">Free</span>
          </div>
          
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-sm font-medium">Units/Month</Label>
            <Input
              type="number"
              min="0"
              max="50"
              value={organicUnits}
              onChange={(e) => setOrganicUnits(parseInt(e.target.value) || 0)}
              className="w-24"
            />
            <div></div>
            <div className="text-sm text-muted-foreground">
              Referrals, repeat customers, organic social
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketing Channels - Each styled like product cards */}
      <div className="space-y-4">
        {channels.map(channel => (
          <Card key={channel.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={channel.isActive}
                    onCheckedChange={(checked) => updateChannel(channel.id, { isActive: checked })}
                  />
                  <Input
                    value={channel.name}
                    onChange={(e) => updateChannel(channel.id, { name: e.target.value })}
                    className="font-medium border-none p-0 h-auto focus:ring-0 focus:border-none bg-transparent"
                    style={{ minWidth: '150px' }}
                  />
                </div>
                {channel.id.startsWith('custom-') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChannel(channel.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {channel.isActive && (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-medium">Monthly Spend</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="50"
                          value={channel.monthlySpend}
                          onChange={(e) => updateChannel(channel.id, { monthlySpend: parseInt(e.target.value) || 0 })}
                          className="pl-6"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Conversion Rate</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0.1"
                          max="20"
                          step="0.1"
                          value={channel.conversionRate}
                          onChange={(e) => updateChannel(channel.id, { conversionRate: parseFloat(e.target.value) || 0 })}
                          className="pr-6"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Estimated Units</Label>
                      <div className="text-lg font-semibold">{channel.unitsPerMonth}/month</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">CAC</Label>
                      <div className="text-lg font-semibold">{formatCurrencyPrecise(channel.costPerUnit)}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
        
        <Button 
          variant="outline" 
          onClick={addCustomChannel}
          className="w-full"
        >
          + Add Custom Channel
        </Button>
      </div>

      {/* Marketing Summary - Styled like Monthly Totals */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-medium">Marketing Summary</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Monthly Spend</span>
              <span className="font-mono font-medium text-red-600">{formatCurrency(totalMarketingSpend)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blended CAC</span>
              <span className="font-mono font-medium">{formatCurrencyPrecise(blendedCAC)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organic Units</span>
              <span className="font-mono font-medium text-green-600">{organicUnits}/month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Units</span>
              <span className="font-mono font-medium">{totalPaidUnits}/month</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Units</span>
                <span className="font-mono font-medium">{organicUnits + totalPaidUnits}/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Target Needed</span>
                <span className="font-mono font-medium">{totalUnitsNeeded}/month</span>
              </div>
              
              {shortfall > 0 && (
                <div className="flex justify-between items-center text-amber-600 mt-2">
                  <span className="font-medium">Shortfall</span>
                  <span className="font-mono font-medium">-{shortfall} units</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-8">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Button>
        
        <Button onClick={onComplete} className="flex items-center gap-2">
          Continue to Business Costs
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}