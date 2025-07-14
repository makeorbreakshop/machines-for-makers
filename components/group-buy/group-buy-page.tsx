'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, DollarSign, Star, Share2, CheckCircle } from 'lucide-react';
import CountdownTimer from './countdown-timer';
import ProgressTracker from './progress-tracker';
import SocialShare from './social-share';

interface GroupBuyPageProps {
  machineId: string;
  machineName: string;
  machineImage: string;
  regularPrice: number;
  groupBuyPrice: number;
  savings: number;
  targetQuantity: number;
  currentQuantity: number;
  depositPercentage: number;
  endDate: Date;
  affiliateLink: string;
  features: string[];
  tradeInOffer?: {
    enabled: boolean;
    maxValue: number;
    description: string;
  };
}

export default function GroupBuyPage({
  machineId,
  machineName,
  machineImage,
  regularPrice,
  groupBuyPrice,
  savings,
  targetQuantity,
  currentQuantity,
  depositPercentage,
  endDate,
  affiliateLink,
  features,
  tradeInOffer
}: GroupBuyPageProps) {
  const progressPercentage = (currentQuantity / targetQuantity) * 100;
  const spotsRemaining = targetQuantity - currentQuantity;
  const depositAmount = (groupBuyPrice * depositPercentage) / 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <Badge variant="destructive" className="mb-4 text-lg px-4 py-2">
            🔥 EXCLUSIVE GROUP BUY
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            {machineName} Group Buy
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join {currentQuantity} other makers and save ${savings.toLocaleString()} per unit. 
            Limited to {targetQuantity} units only.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image and Info */}
            <Card className="overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <img 
                    src={machineImage} 
                    alt={machineName}
                    className="w-full h-64 md:h-full object-cover"
                  />
                </div>
                <div className="md:w-1/2 p-6">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-2xl">{machineName}</CardTitle>
                    <CardDescription>
                      Professional RF metal tube laser engraver
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Regular Price:</span>
                        <span className="text-lg line-through text-gray-400">
                          ${regularPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Group Buy Price:</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${groupBuyPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">You Save:</span>
                        <Badge variant="destructive" className="text-lg px-3 py-1">
                          ${savings.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  What Makes This Deal Special
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {tradeInOffer?.enabled && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      🔄 Trade-In Bonus
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {tradeInOffer.description} - up to ${tradeInOffer.maxValue} value
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>How The Group Buy Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold">Pay 5% Deposit</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Secure your spot with just ${depositAmount.toLocaleString()} deposit
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold">We Reach 20 People</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Group buy activates when we hit our target
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold">Complete Payment</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Pay remaining balance to complete your purchase
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                        4
                      </div>
                      <div>
                        <h4 className="font-semibold">Get Your Machine</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Direct fulfillment at the special group price
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Countdown Timer */}
            <CountdownTimer endDate={endDate} />

            {/* Progress Tracker */}
            <ProgressTracker 
              currentQuantity={currentQuantity}
              targetQuantity={targetQuantity}
              progressPercentage={progressPercentage}
            />

            {/* CTA Section */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Join the Group Buy</CardTitle>
                <CardDescription>
                  {spotsRemaining} spots remaining
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    ${depositAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {depositPercentage}% deposit to secure your spot
                  </div>
                </div>

                <Button 
                  size="lg" 
                  className="w-full text-lg py-6"
                  onClick={() => window.open(affiliateLink, '_blank')}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Join Group Buy - ${groupBuyPrice.toLocaleString()}
                </Button>

                <div className="text-center">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(affiliateLink, '_blank')}
                  >
                    Buy Now at Regular Price - ${regularPrice.toLocaleString()}
                  </Button>
                </div>

                <Separator />

                <div className="text-xs text-gray-500 text-center space-y-1">
                  <p>✅ Direct purchase through OneLaser</p>
                  <p>✅ Exclusive group pricing</p>
                  <p>✅ Limited time offer</p>
                </div>
              </CardContent>
            </Card>

            {/* Social Share */}
            <SocialShare 
              machineName={machineName}
              savings={savings}
              spotsRemaining={spotsRemaining}
            />
          </div>
        </div>

      </div>
    </div>
  );
}