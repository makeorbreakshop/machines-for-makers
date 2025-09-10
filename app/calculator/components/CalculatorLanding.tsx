'use client';

import { useState } from 'react';
import Image from 'next/image';
import CalculatorPreview from './CalculatorPreview';

interface CalculatorLandingProps {
  logoUrl: string | null;
  subscriberCount: number;
}

export default function CalculatorLanding({ logoUrl, subscriberCount }: CalculatorLandingProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Include the current URL with UTM parameters
      const currentUrl = window.location.href;
      
      const response = await fetch('/api/calculator/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          source: 'calculator',
          referrer: currentUrl,
        }),
      });

      if (response.ok) {
        window.location.href = '/calculator/confirm';
      } else {
        const data = await response.json();
        setError(data.error || 'Something went wrong. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError('Connection error. Please check your internet and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* White Header with Logo */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-6">
          <div className="max-w-7xl mx-auto flex justify-center">
            {logoUrl ? (
              <div className="h-12 w-[180px] relative">
                <Image
                  src={logoUrl}
                  alt="Machines for Makers"
                  fill
                  priority
                  sizes="180px"
                  style={{
                    objectFit: 'contain',
                    objectPosition: 'center'
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: '#30A9DE' }}>
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">M</span>
                  </div>
                </div>
                <span className="text-gray-700 font-semibold">Machines for Makers</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section with cyan background */}
      <div className="relative overflow-hidden" style={{ 
        backgroundColor: '#30A9DE',
        minHeight: '450px'
      }}>
        <div className="relative z-10 px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Calculate Your Real Hourly Rate Before Quitting Your Job
            </h1>

            {/* Trust Statement */}
            <p className="text-lg md:text-xl text-white/90 mb-10">
              The truth: Most laser businesses make $3.47/hour after hidden costs. Find yours in 15 minutes.
            </p>

            {/* Email Capture Form */}
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="wedge@roguesquadron.com"
                  className="flex-1 px-5 py-4 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg"
                  required
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-4 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg"
                >
                  {isLoading ? 'Processing...' : 'Start Calculator'}
                </button>
              </div>
              {error && (
                <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <p className="text-xs text-white/80 mt-4">
                Join {subscriberCount.toLocaleString()} makers • Takes 10-15 minutes
              </p>
            </form>
          </div>
        </div>

        {/* Subtle pattern/texture overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
      </div>

      {/* Calculator Preview Section */}
      <div className="px-4 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Preview of Calculator Steps */}
          <div className="mb-12">
            <CalculatorPreview />
          </div>
        </div>
      </div>


      {/* Simple Footer */}
      <div className="px-4 py-8 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            Reveals the 3 killers of machine businesses: Time, Marketing, and Business Costs • 
            No fluff, no course upsells, just math
          </p>
        </div>
      </div>
    </div>
  );
}