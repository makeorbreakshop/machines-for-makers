'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

export default function StickyFormBar() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Animate in after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/laser-comparison/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          source: 'laser-comparison-sticky',
          referrer: document.referrer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      // Track conversion
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          'send_to': 'laser-comparison-sticky-lead',
          'value': 1.0,
          'currency': 'USD'
        });
      }

      // Redirect to comparison page
      router.push('/compare?category=laser-cutters&welcome=true');
    } catch (err) {
      console.error('Form submission error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg transform transition-transform duration-500 z-50 ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
          {/* Text - Cleaner */}
          <div className="text-center md:text-left md:flex-1">
            <p className="text-base font-semibold text-gray-900">
              Compare All 157 Laser Cutters
            </p>
            <p className="text-sm text-gray-600 hidden md:block">
              See specs, prices, and software compatibility side-by-side
            </p>
          </div>

          {/* Form Fields - Using shadcn components */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="h-10 w-full sm:w-64"
              disabled={isLoading}
              autoComplete="email"
              inputMode="email"
            />
            
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-cyan-500 hover:bg-cyan-600 h-10 px-6 text-white font-medium"
            >
              {isLoading ? 'Processing...' : 'Get Access →'}
            </Button>
          </div>

          {/* Close Button - Using lucide icon */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 md:static md:ml-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}