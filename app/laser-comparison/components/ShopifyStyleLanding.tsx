'use client';

import { useState } from 'react';
import Image from 'next/image';
import ComparisonTable from './ComparisonTable';

interface ShopifyStyleLandingProps {
  machines: any[];
  logoUrl: string | null;
  totalLasers: number;
  subscriberCount: number;
}

export default function ShopifyStyleLanding({ machines, logoUrl, totalLasers, subscriberCount }: ShopifyStyleLandingProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Include the current URL with UTM parameters
      const currentUrl = window.location.href;
      
      const response = await fetch('/api/laser-comparison/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          source: 'comparison-chart',
          referrer: currentUrl, // Send current URL instead of document.referrer
        }),
      });

      if (response.ok) {
        window.location.href = '/compare?category=laser-cutters&welcome=true';
      }
    } catch (err) {
      console.error('Form submission error:', err);
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
              Compare All {totalLasers} Laser Cutters With Real-Time Pricing
            </h1>

            {/* Trust Statement */}
            <p className="text-lg md:text-xl text-white/90 mb-10">
              Used by engineers at xTool & OMTech, plus makers from NASA, Apple & Google
            </p>

            {/* Email Capture Form */}
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="max@rebo-band.com"
                  className="flex-1 px-5 py-4 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg"
                  required
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-4 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg"
                >
                  {isLoading ? 'Processing...' : 'Start My Comparison'}
                </button>
              </div>
              <p className="text-xs text-white/80 mt-4">
                Join {subscriberCount.toLocaleString()} makers • Updated every 24 hours • Unsubscribe anytime
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

      {/* Machine Preview Section */}
      <div className="px-4 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Comparison Table */}
          <div className="mb-12">
            <ComparisonTable machines={machines} />
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="inline-flex flex-col items-center">
              <p className="text-gray-600 mb-4">
                Plus {totalLasers - 6} more lasers you're probably researching right now
              </p>
              <button 
                onClick={() => document.querySelector('input')?.focus()}
                className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
                Compare All {totalLasers} Lasers
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Indicators Section */}
      <div className="px-4 py-16" style={{ backgroundColor: '#f6f6f7' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
              <p className="text-gray-600">Real-time price updates</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{subscriberCount.toLocaleString()}</div>
              <p className="text-gray-600">Active users</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">50+</div>
              <p className="text-gray-600">Retailers tracked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <div className="px-4 py-8 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            Used by LightBurn Software developers • Engineers at NASA, Apple, Google, Microsoft, and Tesla • 
            260+ universities including Yale, Cornell, Berkeley, and Harvard • 200+ Omtech laser owners • 
            Makers from 50+ countries worldwide
          </p>
        </div>
      </div>
    </div>
  );
}