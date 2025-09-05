'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface BusinessPlannerContentProps {
  subscriberCount?: number;
}

export function BusinessPlannerContent({ subscriberCount = 54826 }: BusinessPlannerContentProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await fetch('https://app.convertkit.com/forms/7708847/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: 'Kg5sF5GZQZ8l0aHxZHXJOw',
          email,
          tags: ['business-planner']
        })
      });
      
      localStorage.setItem('businessPlannerSubscribed', 'true');
      window.location.href = '/tools/machine-business-calculator/calculator';
    } catch (err) {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-white flex items-center">
      <div className="max-w-2xl mx-auto px-4 py-16 w-full">
        
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Stop Working for $8/Hour
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Most laser business owners think they're making $30 profit per sale. 
            They're actually losing money.
          </p>
          
          <p className="text-lg text-gray-700">
            Our calculator reveals the <span className="font-semibold">37 hidden costs</span> that 
            destroy your profit margins—from platform fees to equipment wear to customer 
            service time.
          </p>
        </div>
        
        {/* Social Proof */}
        <div className="border-y border-gray-200 py-8 mb-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900">43%</p>
              <p className="text-sm text-gray-600">average price increase needed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">2 min</p>
              <p className="text-sm text-gray-600">to complete analysis</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{(subscriberCount / 1000).toFixed(0)}k+</p>
              <p className="text-sm text-gray-600">makers use this</p>
            </div>
          </div>
        </div>
        
        {/* What You'll Learn */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            In 2 minutes, you'll know:
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-gray-400 mt-1">→</span>
              <span>Your real hourly rate (spoiler: it's probably under minimum wage)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gray-400 mt-1">→</span>
              <span>The exact price you need to charge to hit your income goals</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gray-400 mt-1">→</span>
              <span>How many products you need to sell (and if it's even realistic)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gray-400 mt-1">→</span>
              <span>Your 12-month profit forecast with current vs. optimized pricing</span>
            </li>
          </ul>
        </div>
        
        {/* Email Form */}
        <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              autoFocus
            />
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Loading...</span>
              ) : (
                <>
                  Get the Calculator
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          
          <p className="text-xs text-center text-gray-500 mt-4">
            Free forever. No spam. Unsubscribe anytime.
          </p>
        </div>
        
        {/* Bottom Note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Built by makers who learned the hard way that "just selling more" doesn't work.
        </p>
      </div>
    </div>
  );
}