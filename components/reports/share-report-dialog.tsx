'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareReportDialogProps {
  programSlug: string;
  programName: string;
}

export function ShareReportDialog({ programSlug, programName }: ShareReportDialogProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build the shareable URL with current filters
  const getShareableUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const params = searchParams.toString();
    const url = `${baseUrl}/partners/${programSlug}${params ? `?${params}` : ''}`;
    return url;
  };

  // Get a description of the current filter
  const getFilterDescription = () => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    if (!from && !to) {
      return 'All-time performance data';
    }
    
    if (from && to) {
      const startDate = new Date(from);
      const endDate = new Date(to);
      
      // Check if it's a quarter
      const startMonth = startDate.getMonth();
      const endMonth = endDate.getMonth();
      const year = startDate.getFullYear();
      
      if (startMonth % 3 === 0 && endMonth === startMonth + 2) {
        const quarter = Math.floor(startMonth / 3) + 1;
        return `Q${quarter} ${year} performance report`;
      }
      
      // Check if it's a full year
      if (startMonth === 0 && endMonth === 11) {
        return `${year} annual performance report`;
      }
      
      // Custom date range
      const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `Performance from ${start} to ${end}`;
    }
    
    return 'Custom period performance data';
  };

  const copyToClipboard = async () => {
    const url = getShareableUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copied!',
        description: 'The report link has been copied to your clipboard.',
      });
      setOpen(false);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please select and copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Share Partner Report</DialogTitle>
          <DialogDescription>
            Get a shareable link for the {programName} dashboard with current filters
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current Filter Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">Current View:</p>
            <p className="text-sm text-muted-foreground">{getFilterDescription()}</p>
          </div>

          {/* Shareable Link */}
          <div className="space-y-2">
            <Label>Shareable Link</Label>
            <div className="flex gap-2">
              <Input
                value={getShareableUrl()}
                readOnly
                className="font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                size="icon"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link will open the report with the exact date range you've selected. Partners can bookmark it for quick access.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}