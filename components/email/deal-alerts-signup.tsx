'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Mail, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DealAlertsSignupProps {
  className?: string;
  variant?: 'default' | 'compact';
  showBenefits?: boolean;
}

export function DealAlertsSignup({ 
  className,
  variant = 'default',
  showBenefits = false
}: DealAlertsSignupProps) {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ email }),
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

  if (isSubmitted) {
    return (
      <div className={cn("text-center py-4", className)}>
        <Mail className="h-12 w-12 text-blue-500 mb-3 mx-auto" />
        <h4 className="font-semibold mb-2">Check your email!</h4>
        <p className="text-sm text-muted-foreground mb-4">
          We sent a confirmation to <strong>{submittedEmail}</strong>
        </p>
        {variant === 'default' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsSubmitted(false)}
          >
            Sign up another email
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className={cn(
          "flex gap-3",
          variant === 'compact' ? "flex-row" : "flex-col"
        )}>
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(
              variant === 'compact' ? "flex-grow" : "w-full"
            )}
            disabled={isSubmitting}
          />
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className={cn(
              "whitespace-nowrap",
              variant === 'compact' ? "px-8 py-2.5" : "w-full"
            )}
            size={variant === 'compact' ? 'default' : 'lg'}
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
        
        {variant === 'default' && (
          <p className="text-xs text-muted-foreground text-center">
            No spam, unsubscribe anytime. We typically send 1 email per week.
          </p>
        )}
      </form>

      {showBenefits && variant === 'compact' && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-3">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Curated deals only
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-500" />
            Weekly digest
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-purple-500" />
            No spam
          </div>
        </div>
      )}
    </div>
  );
}