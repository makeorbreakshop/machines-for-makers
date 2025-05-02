'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { applyDirectCmykFix } from '@/app/tools/ink-calculator/services/calibration-direct';
import { AlertTriangle } from 'lucide-react';

interface DirectFixButtonProps {
  className?: string;
  onFixComplete?: (success: boolean) => void;
}

export function DirectFixButton({ className = '', onFixComplete }: DirectFixButtonProps) {
  const [isFixing, setIsFixing] = useState(false);
  
  const handleFix = async () => {
    if (!confirm('This will fix CMYK scaling factors and reload the page. Continue?')) {
      return;
    }
    
    setIsFixing(true);
    
    try {
      toast.info('Applying direct CMYK scaling fix...');
      
      // Apply the direct fix
      const success = await applyDirectCmykFix();
      
      if (success) {
        toast.success('CMYK scaling fix applied successfully!');
        
        // Notify parent component
        if (onFixComplete) onFixComplete(true);
        
        // Force a complete page reload to ensure fresh data from the database
        toast.info('Reloading page to apply changes...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Failed to apply CMYK scaling fix');
        if (onFixComplete) onFixComplete(false);
      }
    } catch (error) {
      console.error('Error applying CMYK scaling fix:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (onFixComplete) onFixComplete(false);
    } finally {
      setIsFixing(false);
    }
  };
  
  return (
    <Button
      onClick={handleFix}
      disabled={isFixing}
      variant="destructive"
      className={`gap-2 ${className}`}
    >
      <AlertTriangle className="w-4 h-4" />
      {isFixing ? 'Applying Fix...' : 'Fix CMYK Scaling (Direct)'}
    </Button>
  );
} 