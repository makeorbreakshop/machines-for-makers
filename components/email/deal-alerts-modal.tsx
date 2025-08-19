'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Bell, Mail, CheckCircle2, TrendingDown, DollarSign, Clock } from 'lucide-react';

export function DealAlertsModal() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const params: Record<string, string> = {};
    
    // Capture all UTM parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = searchParams.get(param);
      if (value) params[param] = value;
    });
    
    // Also capture the full landing page URL
    if (Object.keys(params).length > 0) {
      params.landing_page = window.location.href;
    }
    
    setUtmParams(params);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/convertkit/deal-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, utmParams }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsSubmitted(true);
      setSubmittedEmail(email);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form when closing
      setIsSubmitted(false);
      setEmail('');
      setError(null);
    }
  };

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Bell className="mr-2 h-5 w-5" />
            Get Deal Alerts
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl font-semibold mb-2">Check your email!</DialogTitle>
            <DialogDescription className="text-gray-600 mb-4">
              We sent a confirmation to <strong>{submittedEmail}</strong>. 
              Click the link to start receiving deal alerts.
            </DialogDescription>
            <p className="text-sm text-gray-500 mb-6">
              You'll get weekly updates every Tuesday + instant alerts for deals over 20% off.
            </p>
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          size="lg" 
          className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
        >
          <Bell className="mr-2 h-5 w-5" />
          Join Smart Buyers
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            Don't Pay Full Price Ever Again
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            The machines you want go on sale. We tell you first. Our subscribers save big every month.
          </DialogDescription>
        </DialogHeader>
        
        {/* Benefits */}
        <div className="grid grid-cols-3 gap-4 my-6 text-center">
          <div>
            <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Curated Deals</p>
            <p className="text-xs text-gray-500">10%+ off only</p>
          </div>
          <div>
            <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Save Money</p>
            <p className="text-xs text-gray-500">Hundreds saved</p>
          </div>
          <div>
            <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Perfect Timing</p>
            <p className="text-xs text-gray-500">Weekly + instant</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="px-6"
            >
              {isSubmitting ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </div>
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              No spam
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Unsubscribe anytime
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              1 email per week
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}