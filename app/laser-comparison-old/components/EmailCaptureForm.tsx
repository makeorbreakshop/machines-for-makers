'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmailCaptureFormProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function EmailCaptureForm({ isLoading, setIsLoading }: EmailCaptureFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/laser-comparison/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          source: 'laser-comparison-landing',
          referrer: document.referrer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      // Track conversion if analytics available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          'send_to': 'laser-comparison-lead',
          'value': 1.0,
          'currency': 'USD'
        });
      }

      // Redirect to comparison page
      router.push('/compare?category=laser-cutters&welcome=true');
    } catch (err) {
      console.error('Form submission error:', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Email Field - Using shadcn Input */}
      <div>
        <label htmlFor="email" className="sr-only">
          Email Address
        </label>
        <Input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="h-10 text-sm"
          disabled={isLoading}
          autoComplete="email"
          inputMode="email"
        />
      </div>

      {/* Submit Button - Using shadcn Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-10 text-sm font-medium"
        style={{ backgroundColor: '#06B6D4', color: 'white' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0891B2'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#06B6D4'}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : (
          'Show Me All 157 Machines →'
        )}
      </Button>

      {/* Privacy Text - Simplified */}
      <p className="text-xs text-center text-gray-500">
        Weekly price drops only. Unsubscribe anytime.
      </p>
    </form>
  );
}