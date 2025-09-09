import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Calculator, TrendingUp, DollarSign, Clock, Target } from 'lucide-react';
import Link from 'next/link';

// Removed runtime config to prevent conflicts with child routes

export default function MachineBusinessCalculatorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-gray-100 rounded-full">
                <Calculator className="w-8 h-8 text-gray-700" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              "Why My $8,000 Laser Made Me $3.47/Hour"
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              After 6 months of 14-hour days, I finally did the math. The real math. 
              Including the Facebook ads nobody talks about. The returns eating 30% margins. 
              This calculator shows you those numbers BEFORE you quit your job.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 mb-8">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>10-15 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>5 levels of analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Actionable strategies</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Epiphany Bridge Section */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Here's What Nobody Tells You:
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>That $50 cutting board takes 47 minutes total (design, setup, cutting, sanding, finishing, packaging)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Your first 10 sales cost $127 each to acquire (Facebook ads, craft fair booth, failed Etsy listings)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Machine maintenance, failed cuts, and material waste eat another 22% you never calculated</span>
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-600 italic">
            I learned this after burning through $14,000 in 6 months. You can learn it in the next 15 minutes.
          </p>
        </div>
      </div>

      {/* Email Capture Form */}
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Get The Truth About Your Numbers
            </CardTitle>
            <CardDescription className="text-gray-600">
              No sugar-coating. No "you can do it!" motivation. Just the real math that determines 
              if you'll make money or lose your shirt.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form className="space-y-4" action="/tools/machine-business-calculator/calculator" method="get">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Your first name"
                  className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                  required
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                size="lg"
              >
                Show Me The Real Numbers
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
            
            <div className="space-y-3">
              <div className="text-center text-xs text-gray-500">
                <p>
                  Join 1,247 makers who discovered the truth before investing. 
                  We'll email your results plus our "7 Hidden Costs" checklist.
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                <span>🔒</span>
                <span>Your data stays private. No affiliate links. No course upsells.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            The 5 Brutal Truths That Kill Machine Businesses
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Each level strips away another layer of "hopeful math" until you see the real picture
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Level 1 */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700">1</span>
                </div>
                <CardTitle className="text-lg text-gray-900">Initial Setup</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Set your monthly goal and define your products with material costs and pricing
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* Level 2 */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700">2</span>
                </div>
                <CardTitle className="text-lg text-gray-900">The Time Trap</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                "Just 30 minutes per piece" becomes 2 hours with setup, cleanup, and customer emails
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* Level 3 */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700">3</span>
                </div>
                <CardTitle className="text-lg text-gray-900">The $127 First Sale</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Why your customer acquisition cost makes your $50 product actually cost you $77
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* Level 4 */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700">4</span>
                </div>
                <CardTitle className="text-lg text-gray-900">The 40% You Forgot</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Taxes, insurance, software subscriptions - the silent profit killers nobody mentions
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* Level 5 */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700">5</span>
                </div>
                <CardTitle className="text-lg text-gray-900">Your Escape Route</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                3 pricing models that actually work (hint: it's never "just charge more")
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* Results */}
          <Card className="border-gray-200 shadow-sm md:col-span-2 lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg text-gray-900">Your Results</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Download a comprehensive PDF business plan with financial projections
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="bg-gray-100 border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Real Makers, Real Numbers, Real Decisions
            </h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <p className="text-gray-700 mb-4">
                "Spent 3 months building inventory for a craft fair. The calculator showed I'd need 
                to sell 847 units just to break even on booth fees and ads. Saved me from a $6,000 mistake."
              </p>
              <p className="text-sm text-gray-600">
                <strong>Sarah M.</strong> - Glowforge owner, Wisconsin
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <p className="text-gray-700 mb-4">
                "Level 3 made me realize why I was exhausted but broke. I was actually paying customers 
                $12 to take my products after factoring in acquisition costs. Complete game-changer."
              </p>
              <p className="text-sm text-gray-600">
                <strong>Mike D.</strong> - CNC router owner, Michigan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-gray-900 shadow-lg">
          <CardHeader className="text-center pb-6 bg-gray-900 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold">
              Stop Guessing. Start Knowing.
            </CardTitle>
            <CardDescription className="text-gray-300">
              15 minutes now saves 6 months of financial bleeding later
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Two paths forward:
              </p>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>Path 1:</strong> Hope your math is right. Find out in 6 months.
                </p>
                <p>
                  <strong>Path 2:</strong> Know your numbers today. Adjust before investing.
                </p>
              </div>
            </div>
            
            <form className="space-y-4" action="/tools/machine-business-calculator/calculator" method="get">
              <Input
                name="email"
                type="email"
                placeholder="your@email.com"
                className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                required
              />
              
              <Input
                name="firstName"
                type="text"
                placeholder="First name"
                className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                required
              />
              
              <Button 
                type="submit"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                size="lg"
              >
                Calculate My Real Numbers Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
            
            <p className="text-center text-xs text-gray-500">
              Used by 1,247 makers. Average time to complete: 12 minutes. 
              Average money saved: $8,400.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}