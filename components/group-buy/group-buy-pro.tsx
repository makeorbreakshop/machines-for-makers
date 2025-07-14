'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Users, Clock, Zap, TrendingUp, ArrowRight, Shield, Truck, Star, DollarSign } from 'lucide-react';

interface GroupBuyProProps {
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
}

export default function GroupBuyPro({
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
  speed
}: GroupBuyProProps) {
  const progressPercentage = (currentQuantity / targetQuantity) * 100;
  const spotsRemaining = targetQuantity - currentQuantity;
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const discountPercentage = Math.round(((regularPrice - groupBuyPrice) / regularPrice) * 100);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      
      {/* Urgency Banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <Zap className="w-4 h-4 animate-pulse" />
            <span>Limited Time Offer • {spotsRemaining} spots remaining • Ends in {daysLeft} days</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge variant="destructive" className="text-sm px-3 py-1">
              GROUP BUY
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {discountPercentage}% OFF
            </Badge>
          </div>
          
          <h1 className="text-6xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
            {machineName}
          </h1>
          
          <p className="text-2xl text-gray-600 dark:text-gray-300 font-light">
            Join {currentQuantity} makers • Save ${savings.toLocaleString()}
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          
          {/* Left: Product Showcase */}
          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
              <img 
                src={machineImage} 
                alt={machineName}
                className="relative w-full rounded-lg shadow-2xl"
              />
              {/* Floating badges */}
              <div className="absolute top-4 left-4 space-y-2">
                <Badge className="bg-green-600 text-white shadow-lg">
                  <Star className="w-3 h-3 mr-1" />
                  Top Rated
                </Badge>
                <Badge className="bg-blue-600 text-white shadow-lg">
                  RF Metal Tube
                </Badge>
              </div>
            </div>

            {/* Key Specs Card */}
            <Card className="p-6 bg-gray-50 dark:bg-gray-800 border-0">
              <h3 className="font-semibold mb-4 text-lg">Technical Specifications</h3>
              <div className="grid grid-cols-2 gap-4">
                {workArea && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500">Work Area</div>
                    <div className="font-semibold text-lg">{workArea}</div>
                  </div>
                )}
                {laserPower && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500">Laser Power</div>
                    <div className="font-semibold text-lg">{laserPower}</div>
                  </div>
                )}
                {laserType && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500">Laser Type</div>
                    <div className="font-semibold text-lg">{laserType}</div>
                  </div>
                )}
                {speed && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500">Max Speed</div>
                    <div className="font-semibold text-lg">{speed}</div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: Action Panel */}
          <div className="space-y-6">
            
            {/* Pricing Card */}
            <Card className="p-8 border-2 border-blue-200 dark:border-blue-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 opacity-10 rounded-bl-full"></div>
              
              <div className="relative">
                <div className="flex items-baseline justify-between mb-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Regular Price</div>
                    <div className="text-2xl line-through text-gray-400">
                      ${regularPrice.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Group Buy Price</div>
                    <div className="text-4xl font-black text-gray-900 dark:text-white">
                      ${groupBuyPrice.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center mb-6">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg">
                    You Save ${savings.toLocaleString()} ({discountPercentage}% OFF)
                  </div>
                </div>

                {/* Live Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Group Progress
                    </span>
                    <span className="text-sm font-bold">{currentQuantity}/{targetQuantity}</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3 mb-2" />
                  <div className="text-center text-sm text-gray-500">
                    {spotsRemaining} spots remaining • {Math.round(progressPercentage)}% complete
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
                  <div className="text-sm text-center text-gray-600 dark:text-gray-400 mb-2">Offer Ends In</div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-2xl font-bold">{timeLeft.days}</div>
                      <div className="text-xs text-gray-500">Days</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{timeLeft.hours}</div>
                      <div className="text-xs text-gray-500">Hours</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{timeLeft.minutes}</div>
                      <div className="text-xs text-gray-500">Min</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{timeLeft.seconds}</div>
                      <div className="text-xs text-gray-500">Sec</div>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <Button 
                  size="lg" 
                  className="w-full text-lg py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all"
                  onClick={() => window.open(affiliateLink, '_blank')}
                >
                  Join Group Buy Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                {/* Trust Indicators */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <Shield className="w-4 h-4 mx-auto mb-1" />
                    Secure Checkout
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <Truck className="w-4 h-4 mx-auto mb-1" />
                    Free Shipping
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <Star className="w-4 h-4 mx-auto mb-1" />
                    Warranty Included
                  </div>
                </div>
              </div>
            </Card>

            {/* Social Proof */}
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800" />
                  ))}
                </div>
                <div className="text-sm">
                  <div className="font-semibold">{currentQuantity} makers joined</div>
                  <div className="text-gray-600 dark:text-gray-400">in the last 24 hours</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>Group savings so far: <strong>${(savings * currentQuantity).toLocaleString()}</strong></span>
              </div>
            </Card>
          </div>
        </div>

        {/* How It Works - Simplified */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">How Group Buy Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Users, title: "Join the Group", desc: "Click to join via our link" },
              { icon: TrendingUp, title: "Group Forms", desc: "We reach 20 people" },
              { icon: DollarSign, title: "Get Discount", desc: "Everyone saves $696" },
              { icon: Truck, title: "Ships Direct", desc: "From OneLaser to you" }
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}