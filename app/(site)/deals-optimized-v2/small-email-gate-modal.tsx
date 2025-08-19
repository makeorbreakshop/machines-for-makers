'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, Bell, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SmallEmailGateModalProps {
  onClose: () => void;
  onSuccess: () => void;
  totalDeals: number;
  totalSavings: number;
}

export function SmallEmailGateModal({ 
  onClose, 
  onSuccess, 
  totalDeals, 
  totalSavings 
}: SmallEmailGateModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});
  
  // Capture UTM parameters
  useEffect(() => {
    const params: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = searchParams.get(param);
      if (value) params[param] = value;
    });
    if (Object.keys(params).length > 0) {
      params.landing_page = window.location.href;
    }
    setUtmParams(params);
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/convertkit/deal-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          utmParams,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }
      
      // Track conversion
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          send_to: 'deals_email_capture_v2',
          value: totalSavings,
          currency: 'USD',
        });
      }
      
      onSuccess();
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Subscription error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          {/* Clean header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Get All {totalDeals} Deals Instantly
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="bg-white px-6 py-5">
            {/* Value props */}
            <div className="mb-5 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span>Save ${totalSavings.toLocaleString()} on current deals</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Bell className="w-4 h-4 text-blue-600" />
                <span>Instant alerts when prices drop</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-purple-600">✓</span>
                <span>Unsubscribe anytime, no spam</span>
              </div>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  className="w-full"
                  autoFocus
                />
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name (optional)"
                  className="w-full"
                />
              </div>
              
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                size="lg"
              >
                {isSubmitting ? 'Unlocking Deals...' : `Unlock All ${totalDeals} Deals`}
              </Button>
            </form>
            
            <p className="mt-4 text-xs text-center text-gray-500">
              Join 2,487 makers getting exclusive deals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}