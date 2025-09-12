'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share, Download, FileText, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ReportActionsProps {
  shareUrl: string | null;
  reportId: string;
}

export function ReportActions({ shareUrl, reportId }: ReportActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleShare = () => {
    if (shareUrl) {
      const fullUrl = `${window.location.origin}${shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
      toast({
        title: 'Link Copied!',
        description: 'The share link has been copied to your clipboard.',
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/affiliate/reports/${reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete report');
      }

      toast({
        title: 'Report Deleted',
        description: 'The report has been deleted successfully.',
      });

      router.refresh();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete report',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      <Link href={shareUrl || '#'} target="_blank">
        <Button 
          variant="ghost" 
          size="sm"
          title="View Report"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </Link>
      <Button 
        variant="ghost" 
        size="sm"
        title="Share Link"
        onClick={handleShare}
      >
        <Share className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        disabled
        title="Download (Coming Soon)"
      >
        <Download className="h-4 w-4" />
      </Button>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            title="Delete Report"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}