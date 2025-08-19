'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';

interface SimpleEmailGateProps {
  onSuccess: () => void;
  dealCount: number;
  averageSavings?: number;
  subscriberCount?: number;
}

export function SimpleEmailGate({ onSuccess, dealCount, averageSavings = 1200, subscriberCount = 279 }: SimpleEmailGateProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Enter your email');
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
          utmParams: { 
            landing_page: window.location.href
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }
      
      onSuccess();
    } catch (err) {
      setError('Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-8 max-w-md mx-auto">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          Save ${averageSavings.toLocaleString()} on Average
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Join {subscriberCount.toLocaleString()} makers getting exclusive deals
        </p>
        
        <p className="text-sm text-orange-600 dark:text-orange-400 mb-6">
          ⚡ Most deals expire within 3-5 days
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full text-center"
            autoFocus
          />
          
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-full"
            size="lg"
          >
            {isSubmitting ? 'Unlocking...' : `Show Me All ${dealCount} Deals`}
          </Button>
        </form>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          🔒 No spam • Unsubscribe anytime
        </p>
      </div>
    </div>
  );
}