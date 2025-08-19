'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PriceDropCard } from '@/components/price-drops/price-drop-card';
import { Button } from '@/components/ui/button';
import { SimpleEmailGate } from './simple-email-gate';
import { ExitIntentPopup } from './exit-intent-popup';
import { TrendingDown } from 'lucide-react';

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

interface UltraSimpleContentProps {
  initialDrops?: PriceDrop[];
}

const FREE_DEALS_LIMIT = 4; // Show 4 deals then fade to locked deals

export function UltraSimpleContent({ initialDrops = [] }: UltraSimpleContentProps) {
  const searchParams = useSearchParams();
  const [drops, setDrops] = useState<PriceDrop[]>(initialDrops);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [showingAll, setShowingAll] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentShown, setExitIntentShown] = useState(false);
  const [stats, setStats] = useState<{
    machinesOnSale: number;
    totalDrops: number;
    totalSavings: number;
    averageSavings: number;
    subscriberCount: number;
  } | null>(null);
  
  // Check subscriber access with multiple methods
  useEffect(() => {
    const hasLocalStorage = localStorage.getItem('dealAlertsSubscribed') === 'true';
    const hasConvertKitParam = searchParams?.get('utm_source') === 'convertkit';
    const hasDirectAccess = searchParams?.get('access') === 'true';
    
    const isSubscribed = hasLocalStorage || hasConvertKitParam || hasDirectAccess;
    
    // Remember ConvertKit visitors for future visits
    if (hasConvertKitParam && !hasLocalStorage) {
      localStorage.setItem('dealAlertsSubscribed', 'true');
    }
    
    setEmailCaptured(isSubscribed);
    setShowingAll(isSubscribed);
  }, [searchParams]);
  
  // Fetch drops and stats
  useEffect(() => {
    if (!initialDrops.length) {
      fetch('/api/price-drops?days=30&limit=50')
        .then(res => res.json())
        .then(data => setDrops(data.priceDrops || []))
        .catch(console.error);
    }
    
    // Fetch real stats
    fetch('/api/deals-stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, [initialDrops.length]);
  
  const handleEmailCapture = () => {
    setEmailCaptured(true);
    setShowingAll(true);
    localStorage.setItem('dealAlertsSubscribed', 'true');
    setShowExitIntent(false);
  };
  
  // Exit intent detection
  useEffect(() => {
    if (emailCaptured || exitIntentShown) return;
    
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !emailCaptured && !exitIntentShown) {
        setShowExitIntent(true);
        setExitIntentShown(true);
      }
    };
    
    // Also trigger on mobile after 70% scroll
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 70 && !emailCaptured && !exitIntentShown) {
        setShowExitIntent(true);
        setExitIntentShown(true);
      }
    };
    
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [emailCaptured, exitIntentShown]);
  
  const visibleDeals = showingAll ? drops : drops.slice(0, FREE_DEALS_LIMIT);
  const hiddenCount = drops.length - FREE_DEALS_LIMIT;
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Ultra-simple header with real stats */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Real Price Drops. Tracked Daily.
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {stats?.machinesOnSale || drops.length} machines actually cheaper today • Average savings: ${stats?.averageSavings?.toLocaleString() || '605'}
        </p>
      </div>
      
      {/* Show first 4 deals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {visibleDeals.slice(0, FREE_DEALS_LIMIT).map((drop) => (
          <PriceDropCard key={drop.id} drop={drop} />
        ))}
      </div>
      
      {/* Email gate OR remaining deals */}
      {!showingAll && hiddenCount > 0 ? (
        <>
          {/* Email gate */}
          <SimpleEmailGate 
            onSuccess={handleEmailCapture}
            dealCount={drops.length}
            averageSavings={stats?.averageSavings}
            subscriberCount={stats?.subscriberCount}
          />
          
          {/* Faded locked deals preview */}
          <div className="relative mt-12">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white dark:from-transparent dark:via-gray-900/60 dark:to-gray-900 z-10 pointer-events-none"></div>
            <div className="opacity-40 blur-[1px] pointer-events-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {drops.slice(FREE_DEALS_LIMIT, FREE_DEALS_LIMIT + 8).map((drop) => (
                  <PriceDropCard key={drop.id} drop={drop} />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : showingAll && drops.length > FREE_DEALS_LIMIT ? (
        <>
          {/* Divider */}
          <div className="border-t my-8"></div>
          
          {/* Remaining deals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {drops.slice(FREE_DEALS_LIMIT).map((drop) => (
              <PriceDropCard key={drop.id} drop={drop} />
            ))}
          </div>
          
          {/* Success message */}
          <div className="text-center mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-green-700 dark:text-green-400 font-medium">
              ✓ You're getting all deals + instant alerts on new price drops!
            </p>
          </div>
        </>
      ) : null}
      
      {/* Exit Intent Popup */}
      {showExitIntent && !emailCaptured && (
        <ExitIntentPopup
          onClose={() => setShowExitIntent(false)}
          onSuccess={handleEmailCapture}
          biggestSaving={drops[0]?.priceChange ? Math.abs(drops[0].priceChange) : 200}
          machineName={drops[0]?.machineName}
          dealCount={drops.length}
        />
      )}
    </div>
  );
}