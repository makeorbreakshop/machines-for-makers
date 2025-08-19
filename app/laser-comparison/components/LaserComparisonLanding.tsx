'use client';

import { useState } from 'react';
import ComparisonPreview from './ComparisonPreview';
import EmailCaptureForm from './EmailCaptureForm';

export default function LaserComparisonLanding() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

      {/* Hero Section - Above Fold */}
      <div className="px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Trust Signal */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 text-sm text-gray-600 font-medium">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Used by 10,427 makers this month
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 text-center mb-4 leading-tight">
            Compare 157 Laser Cutters
            <span className="block text-2xl md:text-4xl mt-2 text-gray-700">
              Side-by-Side in Seconds
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-600 text-center mb-8 max-w-2xl mx-auto">
            Stop bouncing between 50 browser tabs. See prices, specs, and real work areas 
            for every major laser cutter in one place.
          </p>

          {/* Value Props - Mobile Optimized */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center">
            <div className="flex items-center justify-center gap-2 text-sm md:text-base">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-700">Real prices (no "contact us")</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm md:text-base">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-700">Updated weekly</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm md:text-base">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-700">All brands, unbiased</span>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left: Preview Table */}
            <div className="order-2 md:order-1">
              <ComparisonPreview />
            </div>

            {/* Right: Form */}
            <div className="order-1 md:order-2">
              <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 border-2 border-blue-100">
                {/* Form Header */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Get Instant Access
                  </h2>
                  <p className="text-gray-600">
                    Free forever. No credit card required.
                  </p>
                </div>

                {/* Email Form */}
                <EmailCaptureForm isLoading={isLoading} setIsLoading={setIsLoading} />

                {/* Trust Elements */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      No spam ever
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                      </svg>
                      Instant access
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Proof */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Trusted by makers from:
                </p>
                <div className="flex flex-wrap justify-center gap-4 opacity-60">
                  <span className="text-xs text-gray-500 font-medium">MIT</span>
                  <span className="text-xs text-gray-500 font-medium">•</span>
                  <span className="text-xs text-gray-500 font-medium">Stanford</span>
                  <span className="text-xs text-gray-500 font-medium">•</span>
                  <span className="text-xs text-gray-500 font-medium">NASA</span>
                  <span className="text-xs text-gray-500 font-medium">•</span>
                  <span className="text-xs text-gray-500 font-medium">SpaceX</span>
                  <span className="text-xs text-gray-500 font-medium">•</span>
                  <span className="text-xs text-gray-500 font-medium">Apple</span>
                </div>
              </div>
            </div>
          </div>

          {/* Below Fold - Additional Trust Building */}
          <div className="mt-16 pt-16 border-t border-gray-200">
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
              Why 10,000+ Makers Use Our Comparison Tool
            </h3>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Save $1000s</h4>
                <p className="text-sm text-gray-600">
                  Avoid overpriced machines and find better alternatives in your budget
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Complete Data</h4>
                <p className="text-sm text-gray-600">
                  Every spec that matters: work area, power, speed, software, and real prices
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Decide Fast</h4>
                <p className="text-sm text-gray-600">
                  Stop spending weeks researching. Get all the data you need in one place
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}