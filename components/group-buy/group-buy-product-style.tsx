'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, ArrowRight, Shield, Truck, Award } from 'lucide-react';

interface GroupBuyProductStyleProps {
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
  laserType?: string;
  speed?: string;
  software?: string;
  features?: string[];
}

export default function GroupBuyProductStyle({
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
  laserPower,
  laserType,
  speed,
  software,
  features
}: GroupBuyProductStyleProps) {
  const progressPercentage = (currentQuantity / targetQuantity) * 100;
  const spotsRemaining = targetQuantity - currentQuantity;
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Title and Description - Above grid */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{machineName}</h1>
          <p className="text-gray-600 text-lg">
            Professional RF metal tube laser cutter with exceptional precision and reliability
          </p>
        </div>

        {/* Header Section - Image aligned with pricing */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16 items-start">
          
          {/* Left: Product Image */}
          <div>
            <div className="relative h-[400px]">
              <img 
                src={machineImage} 
                alt={machineName}
                className="w-full h-full object-contain rounded-lg shadow-lg"
              />
              {/* Only Best Desktop Laser badge */}
              <div className="absolute top-4 left-4">
                <Badge className="bg-blue-600 text-white">
                  <Award className="w-3 h-3 mr-1" />
                  Best Desktop Laser
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: Pricing Only */}
          <div>

            {/* Pricing Section */}
            <div className="border rounded-lg p-6 bg-gray-50 h-[400px] flex flex-col justify-between">
              <div className="mb-6">
                <div className="flex items-baseline gap-4 mb-4">
                  <div className="text-2xl line-through text-gray-400">
                    ${regularPrice.toLocaleString()}
                  </div>
                  <div className="text-4xl font-bold text-gray-900">
                    ${groupBuyPrice.toLocaleString()}
                  </div>
                </div>
                <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-lg">
                  Save ${savings.toLocaleString()}
                </div>
              </div>

              {/* Group Progress */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="flex items-center gap-2 font-medium">
                    <Users className="w-4 h-4" />
                    Group Progress
                  </span>
                  <span className="text-sm font-semibold">{currentQuantity}/{targetQuantity} joined</span>
                </div>
                <Progress value={progressPercentage} className="h-3 mb-3" />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{spotsRemaining} spots remaining</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {daysLeft} days left
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <Button 
                size="lg" 
                className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 mb-4"
                onClick={() => window.open(affiliateLink, '_blank')}
              >
                Join Group Buy
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              {/* Trust indicators */}
              <div className="grid grid-cols-3 gap-4 text-center text-xs text-gray-500">
                <div className="flex flex-col items-center">
                  <Shield className="w-4 h-4 mb-1" />
                  Secure Purchase
                </div>
                <div className="flex flex-col items-center">
                  <Truck className="w-4 h-4 mb-1" />
                  Free Shipping
                </div>
                <div className="flex flex-col items-center">
                  <Award className="w-4 h-4 mb-1" />
                  Full Warranty
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-20">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-center mb-12">How The Group Buy Works</h2>
              <div className="max-w-5xl mx-auto">
                <div className="grid md:grid-cols-4 gap-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-full flex items-center justify-center font-bold text-2xl mx-auto mb-4">
                      1
                    </div>
                    <h3 className="font-semibold mb-3 text-lg">Join & Deposit</h3>
                    <p className="text-gray-600">Click "Join Group Buy" and pay just a 5% deposit ($200) to secure your spot at the group price.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-full flex items-center justify-center font-bold text-2xl mx-auto mb-4">
                      2
                    </div>
                    <h3 className="font-semibold mb-3 text-lg">Wait for Group</h3>
                    <p className="text-gray-600">Once we reach 20 people, OneLaser will contact you for full payment of the remaining balance.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-full flex items-center justify-center font-bold text-2xl mx-auto mb-4">
                      3
                    </div>
                    <h3 className="font-semibold mb-3 text-lg">Complete Payment</h3>
                    <p className="text-gray-600">Pay the remaining balance to OneLaser and your machine will be prepared for shipment.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-full flex items-center justify-center font-bold text-2xl mx-auto mb-4">
                      4
                    </div>
                    <h3 className="font-semibold mb-3 text-lg">Receive Machine</h3>
                    <p className="text-gray-600">OneLaser ships your machine directly to you with free shipping and full warranty support.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}