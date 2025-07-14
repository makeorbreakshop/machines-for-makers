'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface SocialShareProps {
  machineName: string;
  savings: number;
  spotsRemaining: number;
}

export default function SocialShare({ machineName, savings, spotsRemaining }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `🔥 Exclusive ${machineName} Group Buy! Save $${savings.toLocaleString()} per unit. Only ${spotsRemaining} spots left!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link');
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
    window.open(url, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Share2 className="h-5 w-5" />
          Share This Deal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Help others save money too!
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={shareToTwitter}
            className="text-xs"
          >
            Twitter
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={shareToFacebook}
            className="text-xs"
          >
            Facebook
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={shareToLinkedIn}
            className="text-xs"
          >
            LinkedIn
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCopyLink}
            className="text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}