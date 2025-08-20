'use client';

import { useState, useEffect } from 'react';
import ComparisonPreview from './ComparisonPreview';
import StickyFormBar from './StickyFormBar';

interface LaserComparisonLandingProps {
  machines: any[];
}

export default function LaserComparisonLanding({ machines }: LaserComparisonLandingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showStickyForm, setShowStickyForm] = useState(false);
  const [currentProof, setCurrentProof] = useState(0);

  const socialProofPoints = [
    "Trusted by engineers at NASA, Apple, and Google",
    "Used by LightBurn Software developers",
    "260+ university makerspaces rely on our data",
    "Join 200+ Omtech owners comparing specs"
  ];

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyForm(window.scrollY > 800);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProof((prev) => (prev + 1) % socialProofPoints.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Form Bar - Shows after scrolling */}
      {showStickyForm && <StickyFormBar />}

      {/* Hero Section */}
      <div className="px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Main Headline */}
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 text-center mb-3">
            157 Laser Cutters Compared in Real-Time
          </h1>

          {/* Subheadline with rotating social proof */}
          <p className="text-lg md:text-xl text-gray-600 text-center mb-2 max-w-3xl mx-auto">
            See actual prices from 50+ retailers • Updated every 24 hours
          </p>
          
          {/* Rotating Social Proof */}
          <p className="text-sm text-gray-500 text-center mb-8 h-5 transition-opacity duration-500">
            {socialProofPoints[currentProof]}
          </p>

          {/* Horizontal Email Capture Form */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsLoading(true);
                  const formData = new FormData(e.currentTarget);
                  const email = formData.get('email');
                  
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

                    if (response.ok) {
                      window.location.href = '/compare?category=laser-cutters&welcome=true';
                    }
                  } catch (err) {
                    console.error('Form submission error:', err);
                    setIsLoading(false);
                  }
                }}
                className="flex flex-col md:flex-row gap-3"
              >
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                  style={{ 
                    backgroundColor: '#0891B2',
                    ':hover': { backgroundColor: '#0E7490' }
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0E7490'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0891B2'}
                >
                  {isLoading ? 'Processing...' : 'Show Me All Machines →'}
                </button>
              </form>
              <p className="text-xs text-gray-500 text-center mt-3">
                Join engineers from NASA, Apple, and 260+ universities • Weekly price drop alerts • Unsubscribe anytime
              </p>
            </div>
          </div>

          {/* Full-width Comparison Table */}
          <ComparisonPreview machines={machines} />

          {/* Simple text-based credibility section */}
          <div className="mt-16 pt-16 border-t border-gray-100">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Who Uses This Tool?</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• LightBurn Software developers (industry-standard laser software)</li>
                <li>• Engineers at NASA, Apple, Google, Microsoft, and Tesla</li>
                <li>• 260+ universities including Yale, Cornell, Berkeley, and Harvard</li>
                <li>• 200+ Omtech laser owners tracking prices</li>
                <li>• Makers from 50+ countries worldwide</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}