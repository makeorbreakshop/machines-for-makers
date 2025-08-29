import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Calculator, TrendingUp, DollarSign, Clock, Target } from 'lucide-react';
import Link from 'next/link';

export const runtime = 'nodejs';

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
              Machine Business Calculator
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Discover if your machine-based business idea is profitable. Get a reality check on time, 
              costs, and pricing through our 5-level analysis system.
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

      {/* Email Capture Form */}
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Start Your Business Analysis
            </CardTitle>
            <CardDescription className="text-gray-600">
              Enter your email to begin the calculator and receive your personalized business plan.
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
                Access Calculator
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
            
            <div className="text-center text-xs text-gray-500">
              <p>
                No spam, ever. We'll send you the calculator results and occasionally share 
                helpful business tips for makers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What You'll Discover
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our 5-level system reveals the hidden realities of machine-based businesses
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
                <CardTitle className="text-lg text-gray-900">Time Reality</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Break down actual time requirements and discover your real hourly rate
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
                <CardTitle className="text-lg text-gray-900">Marketing & CAC</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Calculate customer acquisition costs and reveal the demand ceiling reality
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
                <CardTitle className="text-lg text-gray-900">Business Overhead</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Factor in taxes, insurance, and fixed costs - the scale monster reality
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
                <CardTitle className="text-lg text-gray-900">Pricing & Projections</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Optimize pricing strategies with comprehensive business projections
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
    </div>
  );
}