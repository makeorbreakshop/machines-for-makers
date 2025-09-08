"use client"

import { useState, useEffect } from 'react';
import { Calculator, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MachineCostCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCalculate: (costPerHour: number) => void;
  currentCostPerHour?: number;
}

export function MachineCostCalculator({ 
  open, 
  onOpenChange, 
  onCalculate,
  currentCostPerHour = 5 
}: MachineCostCalculatorProps) {
  // State for calculator inputs - updated with research-based defaults
  const [purchasePrice, setPurchasePrice] = useState<number>(5000);
  const [lifetimeYears, setLifetimeYears] = useState<number>(5); // IRS 5-7 year depreciation
  const [hoursPerYear, setHoursPerYear] = useState<number>(1000); // ~4 hrs/day, 250 days
  const [powerConsumption, setPowerConsumption] = useState<number>(1500); // watts
  const [electricityRate, setElectricityRate] = useState<number>(0.15); // US avg 2025
  const [maintenancePerYear, setMaintenancePerYear] = useState<number>(1000); // Research: $1-3k/year
  const [consumablesPerHour, setConsumablesPerHour] = useState<number>(0.75); // Bits, lenses, nozzles

  // Calculate the hourly cost
  const calculateHourlyCost = () => {
    const totalLifetimeHours = lifetimeYears * hoursPerYear;
    
    // Depreciation per hour
    const depreciationPerHour = purchasePrice / totalLifetimeHours;
    
    // Electricity cost per hour (convert watts to kW)
    const electricityPerHour = (powerConsumption / 1000) * electricityRate;
    
    // Maintenance cost per hour
    const maintenancePerHour = maintenancePerYear / hoursPerYear;
    
    // Total hourly cost
    const totalPerHour = depreciationPerHour + electricityPerHour + maintenancePerHour + consumablesPerHour;
    
    return {
      depreciation: depreciationPerHour,
      electricity: electricityPerHour,
      maintenance: maintenancePerHour,
      consumables: consumablesPerHour,
      total: totalPerHour
    };
  };

  const costs = calculateHourlyCost();

  // Common machine presets - updated with 2025 research data
  const loadPreset = (type: string) => {
    switch(type) {
      case 'diode-laser':
        // Diode laser (5-40W hobby laser like xTool, Atomstack)
        setPurchasePrice(800);
        setPowerConsumption(100); // 50-150W typical for diode
        setMaintenancePerYear(100); // Minimal maintenance
        setConsumablesPerHour(0.10); // Occasional lens cleaning/replacement
        setLifetimeYears(3); // Shorter lifespan for hobby equipment
        setHoursPerYear(500); // Hobby use ~10hrs/week
        break;
      case 'fiber-laser':
        // Desktop fiber laser (20-30W for metal engraving)
        setPurchasePrice(4500);
        setPowerConsumption(200); // Very efficient, 150-300W typical
        setMaintenancePerYear(200); // Practically maintenance-free
        setConsumablesPerHour(0.05); // Minimal - occasional lens cleaning
        setLifetimeYears(7); // 100,000+ hour lifespan
        setHoursPerYear(1500); // Professional use
        break;
      case 'laser':
        // CO2 laser cutter (80-150W hobbyist/small business)
        setPurchasePrice(8000);
        setPowerConsumption(2000); // 1-3kW typical for CO2
        setMaintenancePerYear(1500); // $1-2k for mirrors/lenses
        setConsumablesPerHour(0.80); // Lenses, nozzles, gas if used
        setLifetimeYears(5); // 5-7 year depreciation
        setHoursPerYear(1000);
        break;
      case '3d-fdm':
        // FDM printer (Prusa/Ender class)
        setPurchasePrice(2000);
        setPowerConsumption(250); // 50-300W range, 250W typical
        setMaintenancePerYear(300); // Nozzles, belts, bearings
        setConsumablesPerHour(0); // Filament calculated separately
        setLifetimeYears(5);
        setHoursPerYear(800);
        break;
      case '3d-resin':
        // Resin SLA/LCD printer
        setPurchasePrice(3000);
        setPowerConsumption(60); // 30-150W, very efficient
        setMaintenancePerYear(500); // FEP films, LCD screens
        setConsumablesPerHour(0.50); // IPA, gloves, filters
        setLifetimeYears(5);
        setHoursPerYear(600);
        break;
      case 'cnc':
        // CNC router (hobbyist/small business)
        setPurchasePrice(10000);
        setPowerConsumption(3000); // Spindle + vacuum + dust
        setMaintenancePerYear(2400); // $200/month if heavy use
        setConsumablesPerHour(1.50); // Bits wear ($8-50 each)
        setLifetimeYears(7); // 7 year depreciation
        setHoursPerYear(1200);
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Machine Cost Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate your actual cost per hour based on your machine's specs and usage
          </DialogDescription>
        </DialogHeader>

        {/* Quick Presets */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPreset('diode-laser')}
          >
            Hobby Laser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPreset('fiber-laser')}
          >
            Fiber Laser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPreset('laser')}
          >
            CO2 Laser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPreset('3d-fdm')}
          >
            3D Printer (FDM)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPreset('3d-resin')}
          >
            3D Printer (Resin)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPreset('cnc')}
          >
            CNC Router
          </Button>
        </div>

        <div className="space-y-4">
          {/* Machine Purchase Info */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm">Machine Investment</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase-price" className="flex items-center gap-1">
                  Purchase Price
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total cost of the machine including accessories</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="purchase-price"
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lifetime" className="flex items-center gap-1">
                  Expected Lifetime
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>IRS depreciation: 5 years for most equipment, 7 for some machinery</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="lifetime"
                    type="number"
                    value={lifetimeYears}
                    onChange={(e) => setLifetimeYears(parseFloat(e.target.value) || 1)}
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground">years</span>
                </div>
              </div>

              <div>
                <Label htmlFor="hours-year" className="flex items-center gap-1">
                  Usage Per Year
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>~4 hrs/day × 250 days = 1000 hrs/year typical</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="hours-year"
                    type="number"
                    value={hoursPerYear}
                    onChange={(e) => setHoursPerYear(parseFloat(e.target.value) || 1)}
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operating Costs */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm">Operating Costs</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="power" className="flex items-center gap-1">
                  Power Consumption
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Machine's power usage (check specs or label)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="power"
                    type="number"
                    value={powerConsumption}
                    onChange={(e) => setPowerConsumption(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground">watts</span>
                </div>
              </div>

              <div>
                <Label htmlFor="electricity" className="flex items-center gap-1">
                  Electricity Rate
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>US avg: $0.15/kWh (2025). Check your utility bill</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="electricity"
                    type="number"
                    step="0.01"
                    value={electricityRate}
                    onChange={(e) => setElectricityRate(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground">/kWh</span>
                </div>
              </div>

              <div>
                <Label htmlFor="maintenance" className="flex items-center gap-1">
                  Annual Maintenance
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Typical: $1-3k/year for service, repairs, cleaning</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="maintenance"
                    type="number"
                    value={maintenancePerYear}
                    onChange={(e) => setMaintenancePerYear(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground">/year</span>
                </div>
              </div>

              <div>
                <Label htmlFor="consumables" className="flex items-center gap-1">
                  Consumables
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Router bits, laser lenses, nozzles (not material)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="consumables"
                    type="number"
                    step="0.01"
                    value={consumablesPerHour}
                    onChange={(e) => setConsumablesPerHour(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground">/hour</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-2 p-4 bg-primary/5 rounded-lg border">
            <h4 className="font-medium text-sm mb-3">Cost Breakdown (per hour)</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Depreciation</span>
                <span className="font-mono">${costs.depreciation.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Electricity</span>
                <span className="font-mono">${costs.electricity.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maintenance</span>
                <span className="font-mono">${costs.maintenance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consumables</span>
                <span className="font-mono">${costs.consumables.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between pt-2 border-t font-medium">
                <span>Total Cost Per Hour</span>
                <span className="font-mono text-lg">${costs.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onCalculate(costs.total);
                onOpenChange(false);
              }}
            >
              Use ${costs.total.toFixed(2)}/hour
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}