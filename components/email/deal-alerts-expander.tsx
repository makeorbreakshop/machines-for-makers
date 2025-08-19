'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Mail, CheckCircle2, TrendingDown, DollarSign, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DealAlertsExpander() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
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
        body: JSON.stringify({ email, firstName, utmParams }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsSubmitted(true);
      setSubmittedEmail(email);
      setEmail('');
      setFirstName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 mb-4">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Check your email!</h3>
          <p className="text-gray-600 mb-4">
            We sent a confirmation to <strong>{submittedEmail}</strong>. 
            Click the link to start receiving deal alerts.
          </p>
          <p className="text-sm text-gray-500">
            You'll get weekly updates every Tuesday + instant alerts for deals over 20% off.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button 
        onClick={() => setIsExpanded(!isExpanded)}
        size="lg" 
        className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
      >
        <Mail className="mr-2 h-5 w-5" />
        Get Free Deal Alerts
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-lg mx-auto">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </Button>
                
                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}
                
                <p className="text-xs text-gray-500 text-center">
                  Weekly deals • No spam • Unsubscribe anytime
                </p>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}