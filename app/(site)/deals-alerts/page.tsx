'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, TrendingDown, Bell, DollarSign, Zap, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DealsAlertsPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

      // Success
      setIsSubmitted(true);
      setSubmittedEmail(email);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const recentDeals = [
    { brand: 'xTool', model: 'D1 Pro', discount: '25%', savings: '$150' },
    { brand: 'Glowforge', model: 'Plus', discount: '15%', savings: '$600' },
    { brand: 'Atomstack', model: 'X20 Pro', discount: '30%', savings: '$240' },
  ];

  const stats = {
    totalSavings: '$47,293',
    dealsThisMonth: 127,
    avgDiscount: '22%',
    subscribers: '2,847'
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Never Miss a{' '}
              <span className="text-primary">Laser Cutter Deal</span>{' '}
              Again
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get instant alerts when 3D printers, laser cutters & CNCs go on sale. 
              Join {stats.subscribers} makers saving money every week.
            </p>
          </motion.div>

          {/* Social Proof Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8"
          >
            <div className="bg-card rounded-lg p-4 border">
              <DollarSign className="h-8 w-8 text-green-600 mb-2 mx-auto" />
              <div className="text-2xl font-bold">{stats.totalSavings}</div>
              <div className="text-sm text-muted-foreground">Saved Last Month</div>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <TrendingDown className="h-8 w-8 text-blue-600 mb-2 mx-auto" />
              <div className="text-2xl font-bold">{stats.dealsThisMonth}</div>
              <div className="text-sm text-muted-foreground">Deals This Month</div>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <Bell className="h-8 w-8 text-purple-600 mb-2 mx-auto" />
              <div className="text-2xl font-bold">{stats.avgDiscount}</div>
              <div className="text-sm text-muted-foreground">Avg. Discount</div>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <Mail className="h-8 w-8 text-orange-600 mb-2 mx-auto" />
              <div className="text-2xl font-bold">Weekly</div>
              <div className="text-sm text-muted-foreground">Email Digest</div>
            </div>
          </motion.div>

          {/* Email Capture Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card rounded-lg border shadow-lg p-8 max-w-lg mx-auto"
          >
            {isSubmitted ? (
              <div className="text-center py-4">
                <Mail className="h-16 w-16 text-blue-500 mb-4 mx-auto" />
                <h3 className="text-2xl font-bold mb-2">Check your email!</h3>
                <p className="text-muted-foreground mb-6">
                  We sent a confirmation email to <strong>{submittedEmail}</strong>. 
                  Please click the link to activate your deal alerts.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  After confirming, you'll see our current deals and receive 
                  weekly updates every Tuesday at 10am ET.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsSubmitted(false)}
                >
                  Sign up another email
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold mb-2">Get Deal Alerts</h3>
                <p className="text-muted-foreground mb-6">
                  The best laser cutter deals delivered to your inbox every Tuesday.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-grow"
                      disabled={isSubmitting}
                    />
                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={isSubmitting}
                      className="whitespace-nowrap"
                    >
                      {isSubmitting ? (
                        'Subscribing...'
                      ) : (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Get Alerts
                        </>
                      )}
                    </Button>
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    No spam, unsubscribe anytime. We typically send 1 email per week.
                  </p>
                </form>
              </>
            )}
          </motion.div>

          {/* Recent Deals Ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-8"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Today's Hot Deals
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {recentDeals.map((deal, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                  className="bg-card rounded-full px-4 py-2 border flex items-center gap-2"
                >
                  <span className="font-semibold">{deal.brand} {deal.model}</span>
                  <span className="text-green-600 font-bold">{deal.discount} OFF</span>
                  <span className="text-sm text-muted-foreground">Save {deal.savings}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container py-16 border-t">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Join Our Deal Alerts?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <TrendingDown className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Curated Deals Only</h3>
              <p className="text-sm text-muted-foreground">
                We monitor prices 24/7 and only alert you to genuine discounts of 10% or more
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Perfect Timing</h3>
              <p className="text-sm text-muted-foreground">
                Weekly digest every Tuesday + instant alerts for massive 20%+ drops
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Save Thousands</h3>
              <p className="text-sm text-muted-foreground">
                Our subscribers saved an average of $847 on their laser cutter purchases
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-16 border-t">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            What Makers Are Saying
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <p className="text-muted-foreground mb-4">
                "Saved $600 on my Glowforge Pro thanks to the instant alert. 
                Would have missed it without this service!"
              </p>
              <p className="font-semibold">– Sarah M., Etsy Seller</p>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <p className="text-muted-foreground mb-4">
                "The weekly digest is perfect. I check it every Tuesday and have 
                found amazing deals on materials and accessories."
              </p>
              <p className="font-semibold">– Mike T., Hobbyist</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}