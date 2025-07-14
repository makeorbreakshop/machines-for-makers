'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, DollarSign, Star, Share2, CheckCircle, Zap, Award, Timer, TrendingUp } from 'lucide-react';
import CountdownTimer from './countdown-timer';
import ProgressTracker from './progress-tracker';
import SocialShare from './social-share';

interface GroupBuyPageProps {
  machineId: string;
  machineName: string;
  machineImage: string;
  regularPrice: number;
  groupBuyPrice: number;
  actualPrice?: number;
  savings: number;
  targetQuantity: number;
  currentQuantity: number;
  depositPercentage: number;
  endDate: Date;
  affiliateLink: string;
  workArea?: string;
  laserType?: string;
  laserPower?: string;
  speed?: string;
  software?: string;
  features: string[];
  highlights?: string[];
  bestFor?: string;
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
  actualPrice,
  savings,
  targetQuantity,
  currentQuantity,
  depositPercentage,
  endDate,
  affiliateLink,
  workArea,
  laserType,
  laserPower,
  speed,
  software,
  features,
  highlights,
  bestFor,
  tradeInOffer
}: GroupBuyPageProps) {
  const progressPercentage = (currentQuantity / targetQuantity) * 100;
  const spotsRemaining = targetQuantity - currentQuantity;
  const depositAmount = (groupBuyPrice * depositPercentage) / 100;
  const discountPercentage = Math.round(((regularPrice - groupBuyPrice) / regularPrice) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      {/* Announcement Bar */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-2 px-4 text-center text-sm font-medium">
        🔥 LIMITED TIME: Group Buy ends in {Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days • Only {spotsRemaining} spots remaining!
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Badge variant="destructive" className="text-sm px-3 py-1 animate-pulse">
              EXCLUSIVE GROUP BUY
            </Badge>
            {bestFor && (
              <Badge variant="outline" className="text-sm px-3 py-1 border-blue-200 text-blue-700">
                <Award className="w-3 h-3 mr-1" />
                {bestFor}
              </Badge>
            )}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {machineName}
            </span>
            <br />
            <span className="text-3xl md:text-4xl font-bold text-gray-700 dark:text-gray-300">
              Group Buy
            </span>
          </h1>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">{currentQuantity} makers joined</span>
            </div>
            <div className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="font-semibold">Save ${savings.toLocaleString()} ({discountPercentage}% off)</span>
            </div>
            <div className="flex items-center gap-2 text-lg">
              <Timer className="w-5 h-5 text-red-600" />
              <span className="font-semibold">Limited to {targetQuantity} units</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 mb-16">
          {/* Main Content - Takes up more space */}
          <div className="lg:col-span-3 space-y-8">
            {/* Product Hero */}
            <Card className="overflow-hidden border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <div className="relative">
                <img 
                  src={machineImage} 
                  alt={machineName}
                  className="w-full h-96 object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-green-600 text-white px-3 py-1 text-sm">
                    ✓ In Stock
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="destructive" className="px-3 py-1 text-sm animate-pulse">
                    {spotsRemaining} LEFT
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-4">{machineName}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Professional desktop laser cutter with RF metal tube technology
                    </p>
                    
                    {/* Key Specs */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {workArea && (
                        <div>
                          <div className="text-sm text-gray-500 font-medium">Work Area</div>
                          <div className="font-semibold">{workArea}</div>
                        </div>
                      )}
                      {laserPower && (
                        <div>
                          <div className="text-sm text-gray-500 font-medium">Laser Power</div>
                          <div className="font-semibold">{laserPower}</div>
                        </div>
                      )}
                      {laserType && (
                        <div>
                          <div className="text-sm text-gray-500 font-medium">Laser Type</div>
                          <div className="font-semibold">{laserType}</div>
                        </div>
                      )}
                      {speed && (
                        <div>
                          <div className="text-sm text-gray-500 font-medium">Max Speed</div>
                          <div className="font-semibold">{speed}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Pricing */}
                    <div className="text-center md:text-right">
                      <div className="text-sm text-gray-500 mb-1">Regular Price</div>
                      <div className="text-2xl line-through text-gray-400 mb-2">
                        ${regularPrice.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 mb-1">Group Buy Price</div>
                      <div className="text-4xl font-black text-green-600 mb-2">
                        ${groupBuyPrice.toLocaleString()}
                      </div>
                      <Badge variant="destructive" className="text-lg px-4 py-2">
                        Save ${savings.toLocaleString()}
                      </Badge>
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3">
                      <Button 
                        size="lg" 
                        className="w-full text-lg py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                        onClick={() => window.open(affiliateLink, '_blank')}
                      >
                        <Zap className="mr-2 h-5 w-5" />
                        Join Group Buy - ${groupBuyPrice.toLocaleString()}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(affiliateLink, '_blank')}
                      >
                        Buy Individual at ${actualPrice ? actualPrice.toLocaleString() : regularPrice.toLocaleString()}
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500 text-center space-y-1">
                      <p>✓ Direct purchase through OneLaser</p>
                      <p>✓ Full manufacturer warranty</p>
                      <p>✓ Free shipping included</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Star className="h-6 w-6 text-yellow-500" />
                  Why This Deal is Special
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-lg">Key Features</h4>
                    <ul className="space-y-3">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    {highlights && (
                      <>
                        <h4 className="font-semibold mb-3 text-lg">Highlights</h4>
                        <ul className="space-y-2 mb-6">
                          {highlights.map((highlight, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">{highlight}</Badge>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {tradeInOffer?.enabled && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                          🔄 Trade-In Bonus
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {tradeInOffer.description} - up to ${tradeInOffer.maxValue} value
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl">How The Group Buy Works</CardTitle>
                <CardDescription>Simple process to get exclusive pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  {[
                    { step: 1, title: "Click Join", desc: "Use our exclusive group buy link" },
                    { step: 2, title: "Complete Purchase", desc: "Buy directly through OneLaser" },
                    { step: 3, title: "Get Group Price", desc: "Automatic discount applied" },
                    { step: 4, title: "Receive Machine", desc: "Fast shipping from OneLaser" }
                  ].map((item) => (
                    <div key={item.step} className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
                        {item.step}
                      </div>
                      <h4 className="font-semibold mb-2">{item.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - More compact */}
          <div className="lg:col-span-2 space-y-6">
            {/* Countdown Timer */}
            <CountdownTimer endDate={endDate} />

            {/* Progress Tracker */}
            <ProgressTracker 
              currentQuantity={currentQuantity}
              targetQuantity={targetQuantity}
              progressPercentage={progressPercentage}
            />

            {/* Quick Stats */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Group Buy Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Savings</span>
                  <span className="font-bold text-green-600">${(savings * currentQuantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg. per Member</span>
                  <span className="font-bold">${savings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Success Rate</span>
                  <span className="font-bold text-blue-600">{Math.round(progressPercentage)}%</span>
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