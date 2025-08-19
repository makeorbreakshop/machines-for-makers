'use client';

import { useState, useEffect, useCallback } from 'react';
import { PriceDropCard } from '@/components/price-drops/price-drop-card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Lock, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SmallEmailGateModal } from './small-email-gate-modal';

interface PriceDrop {
  id: string;
  machineId: string;
  machineName: string;
  company: string;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  percentageChange: number;
  dropDate: string;
  isAllTimeLow: boolean;
  productLink: string;
  affiliateLink?: string;
  imageUrl?: string;
  category: string;
  priceCategory?: string;
  award?: string;
  workArea?: string;
  dropType: string;
}

interface OptimizedPriceDropsContentProps {
  initialDrops?: PriceDrop[];
}

const FREE_DEALS_LIMIT = 4; // Show only 4 deals initially for cleaner approach

export function OptimizedPriceDropsContent({ initialDrops = [] }: OptimizedPriceDropsContentProps) {
  const [drops, setDrops] = useState<PriceDrop[]>(initialDrops);
  const [loading, setLoading] = useState(!initialDrops.length);
  const [error, setError] = useState<string | null>(null);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Check if email was already captured
  useEffect(() => {
    const captured = localStorage.getItem('dealAlertsSubscribed') === 'true';
    setEmailCaptured(captured);
  }, []);
  
  
  // Fetch drops if not provided initially
  useEffect(() => {
    if (!initialDrops.length) {
      fetchDrops();
    }
  }, []);
  
  const fetchDrops = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/price-drops?days=30&limit=50');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDrops(data.priceDrops || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  
  const handleEmailCapture = () => {
    setEmailCaptured(true);
    setShowEmailModal(false);
    localStorage.setItem('dealAlertsSubscribed', 'true');
  };
  
  // Determine visible vs locked deals
  const visibleDeals = emailCaptured ? drops : drops.slice(0, FREE_DEALS_LIMIT);
  const lockedDeals = emailCaptured ? [] : drops.slice(FREE_DEALS_LIMIT);
  const lockedSavings = lockedDeals.reduce((sum, drop) => sum + Math.abs(drop.priceChange), 0);
  
  if (loading && !initialDrops.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading deals...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert className="max-w-2xl mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <>
      <div className="space-y-6">
        {/* Simple header */}
        <div className="text-center pb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {loading ? 'Loading deals...' : `${visibleDeals.length} of ${drops.length} Best Deals`}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sign up to unlock all {drops.length} deals and get instant price drop alerts
          </p>
        </div>
        
        {/* Visible Deals Grid Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleDeals.map((drop) => (
            <PriceDropCard key={drop.id} drop={drop} />
          ))}
        </div>
        
        {/* Email Gate Section - Only show if deals are locked */}
        {!emailCaptured && lockedDeals.length > 0 && (
          <>
            {/* Eye-catching Gate CTA */}
            <div className="my-16">
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 px-8 py-10 rounded-2xl shadow-lg">
                <div className="text-center max-w-2xl mx-auto">
                  <div className="mx-auto flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full mb-6">
                    <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">
                    🎉 {lockedDeals.length} More Amazing Deals Waiting!
                  </h3>
                  <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
                    Join 2,487 makers getting exclusive deals.<br/>
                    Get instant access to all deals + price drop alerts when new deals arrive.
                  </p>
                  <Button
                    onClick={() => setShowEmailModal(true)}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all text-lg"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Unlock All {drops.length} Deals Now
                  </Button>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    ✓ Free • ✓ No spam • ✓ Unsubscribe anytime
                  </p>
                </div>
              </div>
            </div>
            
            {/* Locked Deals Preview with Blur */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white z-10 pointer-events-none"></div>
              <div className="blur-[2px] opacity-50 pointer-events-none">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {lockedDeals.slice(0, 8).map((drop) => (
                    <div key={drop.id} className="relative">
                      <PriceDropCard drop={drop} />
                      <div className="absolute top-4 right-4 z-20">
                        <Lock className="w-6 h-6 text-gray-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Centered unlock button over blurred content */}
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <Button
                  onClick={() => setShowEmailModal(true)}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-full font-semibold shadow-xl text-lg"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Unlock {lockedDeals.length} More Deals
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Email Modal */}
      {showEmailModal && (
        <SmallEmailGateModal
          onClose={() => setShowEmailModal(false)}
          onSuccess={handleEmailCapture}
          totalDeals={drops.length}
          totalSavings={lockedSavings}
        />
      )}
    </>
  );
}