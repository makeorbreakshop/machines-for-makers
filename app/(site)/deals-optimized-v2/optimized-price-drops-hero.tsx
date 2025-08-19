'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Bell, TrendingDown, Star, DollarSign, Mail } from 'lucide-react';
import { SmallEmailGateModal } from './small-email-gate-modal';

interface Stats {
  totalDrops: number;
  totalSavings: number;
  biggestDrop: number;
  allTimeLows: number;
}

interface OptimizedPriceDropsHeroProps {
  stats?: Stats;
}

export function OptimizedPriceDropsHero({ stats }: OptimizedPriceDropsHeroProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const searchParams = useSearchParams();
  
  // Check if email was already captured (from localStorage)
  useEffect(() => {
    const captured = localStorage.getItem('dealAlertsSubscribed') === 'true';
    setEmailCaptured(captured);
  }, []);

  const handleEmailCapture = () => {
    setEmailCaptured(true);
    setShowEmailModal(false);
    localStorage.setItem('dealAlertsSubscribed', 'true');
  };

  return (
    <>
      {/* Clean hero matching site aesthetic */}
      <div className="w-full border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Main Content - centered like original */}
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
              Price Drops & Deals
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Track real-time price drops on laser cutters, 3D printers, and CNC machines.<br className="hidden sm:inline" />
              {stats && stats.totalDrops > 0 ? `${stats.totalDrops} active deals available now.` : 'Never miss a deal with our automated price monitoring.'}
            </p>
          </div>

          {/* Stats badges - subtle and clean */}
          {stats && (
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {stats.biggestDrop > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  <TrendingDown className="w-4 h-4" />
                  Up to {stats.biggestDrop}% OFF
                </div>
              )}
              {stats.allTimeLows > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                  <Star className="w-4 h-4" />
                  {stats.allTimeLows} All-Time Lows
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                <Bell className="w-4 h-4" />
                Real-time tracking
              </div>
            </div>
          )}
          
          {/* Call to Action - clean button */}
          <div className="max-w-xl mx-auto text-center">
            {!emailCaptured ? (
              <>
                <Button 
                  onClick={() => setShowEmailModal(true)}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Get Free Deal Alerts • View All {stats?.totalDrops || '31'} Deals
                </Button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Free instant alerts when prices drop • No spam • Unsubscribe anytime
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <Bell className="w-5 h-5" />
                <span className="font-medium">You're subscribed to deal alerts!</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Clean notification bar without loud colors */}
      {stats && stats.totalDrops > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border-b">
          <div className="container mx-auto px-4 py-2 max-w-7xl">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="w-4 h-4" />
              <span>
                Prices update in real-time • Deals may expire without notice
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Email Gate Modal */}
      {showEmailModal && (
        <SmallEmailGateModal
          onClose={() => setShowEmailModal(false)}
          onSuccess={handleEmailCapture}
          totalDeals={stats?.totalDrops || 31}
          totalSavings={stats?.totalSavings || 0}
        />
      )}
    </>
  );
}