'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Clock, ArrowRight } from 'lucide-react';

interface GroupBuyMinimalProps {
  machineName: string;
  machineImage: string;
  regularPrice: number;
  groupBuyPrice: number;
  savings: number;
  targetQuantity: number;
  currentQuantity: number;
  endDate: Date;
  affiliateLink: string;
  workArea?: string;
  laserPower?: string;
}

export default function GroupBuyMinimal({
  machineName,
  machineImage,
  regularPrice,
  groupBuyPrice,
  savings,
  targetQuantity,
  currentQuantity,
  endDate,
  affiliateLink,
  workArea,
  laserPower
}: GroupBuyMinimalProps) {
  const progressPercentage = (currentQuantity / targetQuantity) * 100;
  const spotsRemaining = targetQuantity - currentQuantity;
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        
        {/* Simple Header */}
        <div className="text-center mb-16">
          <Badge variant="destructive" className="mb-6 text-base px-4 py-2">
            Group Buy • {spotsRemaining} spots left
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {machineName}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Save ${savings.toLocaleString()} when we reach {targetQuantity} people
          </p>
        </div>

        {/* Product & Pricing - Single Row */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          
          {/* Product Image - Bigger */}
          <div>
            <img 
              src={machineImage} 
              alt={machineName}
              className="w-full rounded-lg shadow-lg"
            />
          </div>

          {/* Pricing & Action */}
          <div className="space-y-8">
            
            {/* Price Block */}
            <div className="text-center md:text-left">
              <div className="flex items-baseline justify-center md:justify-start gap-4 mb-4">
                <span className="text-3xl line-through text-gray-400">
                  ${regularPrice.toLocaleString()}
                </span>
                <span className="text-5xl font-bold text-gray-900">
                  ${groupBuyPrice.toLocaleString()}
                </span>
              </div>
              <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                Save ${savings.toLocaleString()}
              </div>
            </div>

            {/* Quick Specs */}
            {(workArea || laserPower) && (
              <div className="flex justify-center md:justify-start gap-8 text-sm">
                {workArea && (
                  <div>
                    <div className="text-gray-500">Work Area</div>
                    <div className="font-semibold">{workArea}</div>
                  </div>
                )}
                {laserPower && (
                  <div>
                    <div className="text-gray-500">Laser Power</div>
                    <div className="font-semibold">{laserPower}</div>
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {currentQuantity}/{targetQuantity} joined
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {daysLeft} days left
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2 mb-2" />
              <div className="text-center text-sm text-gray-500">
                {spotsRemaining} spots remaining
              </div>
            </div>

            {/* CTA */}
            <Button 
              size="lg" 
              className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open(affiliateLink, '_blank')}
            >
              Join Group Buy
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <div className="text-center text-sm text-gray-500">
              Direct purchase through OneLaser • Free shipping • Full warranty
            </div>
          </div>
        </div>

        {/* How It Works - Simplified */}
        <div className="border-t pt-16">
          <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
          <div className="max-w-2xl mx-auto">
            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="font-bold text-blue-600 text-lg">1.</span>
                <div>
                  <h3 className="font-semibold mb-1">Join the Group</h3>
                  <p className="text-gray-600">Click the button above to join via our affiliate link</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="font-bold text-blue-600 text-lg">2.</span>
                <div>
                  <h3 className="font-semibold mb-1">Purchase Direct</h3>
                  <p className="text-gray-600">Buy directly from OneLaser at the group discount price</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="font-bold text-blue-600 text-lg">3.</span>
                <div>
                  <h3 className="font-semibold mb-1">Get Your Machine</h3>
                  <p className="text-gray-600">OneLaser ships directly to you with full warranty</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}