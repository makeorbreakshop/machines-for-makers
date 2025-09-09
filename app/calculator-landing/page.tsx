'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function CalculatorLandingPage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch('/api/site-logo');
        const data = await response.json();
        if (data.url) {
          setLogoUrl(data.url);
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };
    fetchLogo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Store in localStorage for now (you can add API call here later)
    localStorage.setItem('calculator_email', email);
    localStorage.setItem('calculator_name', firstName);
    
    // Redirect to calculator
    router.push('/tools/machine-business-calculator/calculator');
  };

  return (
    <div className="min-h-screen bg-white">{/* No header - logo will be in main content */}

      {/* Main Content */}
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          {/* Real Machines for Makers Logo */}
          <div className="mb-8">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Machines for Makers"
                width={200}
                height={60}
                className="mx-auto"
                priority
              />
            ) : (
              // Fallback to text while loading
              <div className="inline-flex items-center gap-2">
                <span className="text-xl font-semibold text-gray-900">Machines for Makers</span>
              </div>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Machine Business Calculator
          </h1>
          
          <p className="text-lg text-gray-600 mb-2">
            See if your laser/CNC/3D printing business will actually make money
          </p>
          
          <p className="text-sm text-gray-500">
            Takes 10-15 minutes • No credit card required
          </p>
        </div>

        {/* Simple Form */}
        <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Get Free Access
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full"
              />
            </div>
            
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
                required
                className="w-full"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : (
                <>
                  Start Calculator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-gray-500 mt-4">
              We'll email you your results. No spam, unsubscribe anytime.
            </p>
          </form>
        </div>

        {/* Simple Benefits */}
        <div className="mt-12 text-center">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
            What You'll Learn
          </h3>
          <div className="space-y-2 text-gray-600">
            <p>✓ Your real hourly wage after all costs</p>
            <p>✓ How many products you need to sell monthly</p>
            <p>✓ Marketing costs nobody talks about</p>
            <p>✓ Whether to quit your day job</p>
          </div>
        </div>
      </div>
    </div>
  );
}