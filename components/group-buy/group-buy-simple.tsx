'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Clock, DollarSign } from 'lucide-react';

interface GroupBuySimpleProps {
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

export default function GroupBuySimple({
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
}: GroupBuySimpleProps) {
  const progressPercentage = (currentQuantity / targetQuantity) * 100;
  const spotsRemaining = targetQuantity - currentQuantity;
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="destructive" className="mb-4 text-sm px-3 py-1">
            🔥 GROUP BUY
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {machineName}
          </h1>
          <p className="text-xl text-gray-600">
            Save ${savings.toLocaleString()} when {targetQuantity} people join
          </p>
        </div>

        {/* Main Product Section */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          
          {/* Product Image */}
          <div>
            <img 
              src={machineImage} 
              alt={machineName}
              className="w-full rounded-lg shadow-lg"
            />
          </div>

          {/* Product Info */}
          <div className="space-y-8">
            
            {/* Pricing */}
            <div>
              <div className="text-sm text-gray-500 mb-1">Regular Price</div>
              <div className="text-2xl line-through text-gray-400 mb-2">
                ${regularPrice.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mb-1">Group Buy Price</div>
              <div className="text-4xl font-bold text-green-600 mb-4">
                ${groupBuyPrice.toLocaleString()}
              </div>
              <Badge variant="destructive" className="text-lg px-4 py-2">
                Save ${savings.toLocaleString()}
              </Badge>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b">
              {workArea && (
                <div>
                  <div className="text-sm text-gray-500">Work Area</div>
                  <div className="font-semibold">{workArea}</div>
                </div>
              )}
              {laserPower && (
                <div>
                  <div className="text-sm text-gray-500">Laser Power</div>
                  <div className="font-semibold">{laserPower}</div>
                </div>
              )}
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-500">{currentQuantity}/{targetQuantity} joined</span>
              </div>
              <Progress value={progressPercentage} className="mb-2" />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{Math.round(progressPercentage)}% complete</span>
                <span>{spotsRemaining} spots left</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{currentQuantity}</span>
                </div>
                <div className="text-xs text-gray-500">Joined</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold">{daysLeft}</span>
                </div>
                <div className="text-xs text-gray-500">Days Left</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-semibold">{spotsRemaining}</span>
                </div>
                <div className="text-xs text-gray-500">Spots Left</div>
              </div>
            </div>

            {/* CTA */}
            <Button 
              size="lg" 
              className="w-full text-lg py-6"
              onClick={() => window.open(affiliateLink, '_blank')}
            >
              Join Group Buy - ${groupBuyPrice.toLocaleString()}
            </Button>

          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">1</div>
              <h3 className="font-semibold mb-2">Join</h3>
              <p className="text-sm text-gray-600">Click the button to join through our affiliate link</p>
            </div>
            <div>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">2</div>
              <h3 className="font-semibold mb-2">Buy</h3>
              <p className="text-sm text-gray-600">Purchase directly from OneLaser at group price</p>
            </div>
            <div>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">3</div>
              <h3 className="font-semibold mb-2">Save</h3>
              <p className="text-sm text-gray-600">Automatically get ${savings.toLocaleString()} off the regular price</p>
            </div>
            <div>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">4</div>
              <h3 className="font-semibold mb-2">Receive</h3>
              <p className="text-sm text-gray-600">Machine ships directly from OneLaser</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}