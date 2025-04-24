import { formatDistanceToNow, format } from 'date-fns';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BatchSummary } from '@/app/api/types/batch';

interface BatchSummaryCardProps {
  summary: BatchSummary;
}

export function BatchSummaryCard({ summary }: BatchSummaryCardProps) {
  // Calculate progress percentage
  const progressPercentage = summary.totalMachines > 0 
    ? Math.min(100, Math.floor((summary.completedMachines / summary.totalMachines) * 100))
    : 0;
  
  // Format duration or show running
  const runDuration = summary.endTime
    ? formatDistanceToNow(new Date(summary.endTime), { addSuffix: false })
    : 'Running';
  
  // Format start time
  const startTimeFormatted = format(new Date(summary.startTime), 'PPpp');
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Batch Summary</CardTitle>
          <StatusBadge status={summary.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Batch ID: {summary.id}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Progress
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{summary.completedMachines} of {summary.totalMachines} machines processed</span>
              <span>{progressPercentage}%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard 
              title="Started" 
              value={startTimeFormatted} 
              tooltip="When this batch was started"
            />
            <StatCard 
              title="Duration" 
              value={runDuration} 
              tooltip={summary.endTime ? "Total time to complete" : "Currently running"}
            />
            <StatCard 
              title="Successful" 
              value={summary.successfulMachines.toString()} 
              tooltip="Machines with successfully extracted prices"
            />
            <StatCard 
              title="Failed" 
              value={summary.failedMachines.toString()}
              tooltip="Machines where price extraction failed" 
            />
            <StatCard 
              title="Updated" 
              value={summary.updatedMachines.toString()}
              tooltip="Machines with new prices different from old prices"
            />
            <StatCard 
              title="Needs Review" 
              value={summary.needsReviewMachines.toString()}
              tooltip="Machines flagged for manual review"
              highlight={summary.needsReviewMachines > 0}
            />
          </div>
          
          {summary.estimatedCost !== undefined && summary.estimatedCost !== null && (
            <div className="mt-4 text-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <span className="mr-1">Estimated LLM Cost:</span>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Total estimated cost of LLM API calls for this batch
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="font-medium">
                ${summary.estimatedCost.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  
  switch (status) {
    case 'completed':
      variant = "default";
      break;
    case 'running':
      variant = "secondary";
      break;
    case 'failed':
      variant = "destructive";
      break;
    case 'cancelled':
      variant = "outline";
      break;
  }
  
  return (
    <Badge variant={variant}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  tooltip: string;
  highlight?: boolean;
}

function StatCard({ title, value, tooltip, highlight = false }: StatCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`rounded-lg border p-3 ${highlight ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900' : ''}`}>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-2xl font-bold truncate">{value}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 