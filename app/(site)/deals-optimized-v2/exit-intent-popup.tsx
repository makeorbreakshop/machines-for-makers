'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExitIntentPopupProps {
  onClose: () => void;
  onSuccess: () => void;
  biggestSaving?: number;
  machineName?: string;
  dealCount?: number;
}

export function ExitIntentPopup({ 
  onClose, 
  onSuccess, 
  biggestSaving = 2400,
  machineName = "XTool P2",
  dealCount = 31
}: ExitIntentPopupProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/convertkit/deal-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          utmParams: { 
            landing_page: window.location.href,
            trigger: 'exit_intent'
          }
        }),
      });
      
      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      // Silent fail, don't annoy user
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
            Before you go...
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            The {machineName} is ${biggestSaving.toLocaleString()} off right now.
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Want to see all {dealCount || 31} current deals?
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full"
              autoFocus
            />
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3"
              size="lg"
            >
              {isSubmitting ? 'Loading...' : 'View All Deals'}
            </Button>
          </form>
          
          <button
            onClick={onClose}
            className="text-sm text-gray-500 mt-3 underline"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}