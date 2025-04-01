'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type TranscriptionStatus = {
  videoId: string;
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  timestamp: Date;
};

type TranscriptionStatusProps = {
  videoId: string;
  isTranscribing: boolean;
  onComplete?: () => void;
};

export default function TranscriptionStatus({ 
  videoId, 
  isTranscribing,
  onComplete
}: TranscriptionStatusProps) {
  const [status, setStatus] = useState<TranscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [pollingActive, setPollingActive] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);

  useEffect(() => {
    setPollingActive(isTranscribing);
    
    if (isTranscribing) {
      // Start with an initial status check
      checkStatus();
      // Add initial log message
      setMessages(["Starting transcription process..."]);
    } else {
      // Reset status if we're not transcribing
      setStatus(null);
      setMessages([]);
    }
  }, [isTranscribing, videoId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (pollingActive) {
      interval = setInterval(() => {
        checkStatus();
      }, 2000); // Check every 2 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [pollingActive, videoId]);

  const checkStatus = async () => {
    try {
      setLoading(true);
      setLastPollTime(new Date());
      
      // Only show errors after multiple failed attempts
      if (retryCount > 3) {
        setError(null);
      }
      
      const response = await fetch(`/api/admin/youtube/videos/${videoId}/transcribe/status`);
      
      if (response.status === 404) {
        // Status endpoint might not be ready yet, increment retry count
        setRetryCount(prev => prev + 1);
        
        // Show message after a few retries
        if (retryCount >= 3 && retryCount < 4) {
          setMessages(prev => [...prev, "Waiting for transcription to start..."]);
        }
        
        // Add fallback status if we're still not getting a response after several retries
        if (retryCount >= 5 && !status) {
          setStatus({
            videoId,
            step: 'init',
            status: 'processing',
            progress: 10,
            message: 'Processing your request. This may take several minutes.',
            timestamp: new Date()
          });
        }
        
        return;
      }
      
      // Reset retry count on successful response
      if (retryCount > 0) {
        setRetryCount(0);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }
      
      const data = await response.json();
      
      // Update status
      setStatus(data);
      
      // Add audio file size info to messages if available
      if (data.message && data.message.includes('Audio file size:')) {
        const sizeMessage = `Audio: ${data.message.match(/Audio file size: (.+)MB/)?.[1] || 'Unknown'} MB`;
        if (!messages.some(m => m.includes('Audio:'))) {
          setMessages(prev => [...prev, sizeMessage]);
        }
      }
      
      // Add new message if it's different from the last one
      if (data.message && (messages.length === 0 || messages[messages.length - 1] !== data.message)) {
        // Filter out less important messages to avoid cluttering
        if (
          !data.message.includes('ffmpeg:') && 
          !data.message.includes('[download]') &&
          !data.step.includes('ffmpeg_progress') &&
          !data.step.includes('yt-dlp_progress')
        ) {
          setMessages(prev => [...prev, data.message]);
        }
        
        // For download/conversion progress, update the last message rather than adding new ones
        if (data.message.includes('[download]') && data.message.includes('%')) {
          const progressMsg = `Download progress: ${data.message.match(/\d+(\.\d+)?%/)?.[0] || '0%'}`;
          setMessages(prev => {
            const filtered = prev.filter(m => !m.startsWith('Download progress:'));
            return [...filtered, progressMsg];
          });
        }
        
        // Add compressed audio notification
        if (data.step === 'file_size_check') {
          const sizeInfo = `Audio file compressed to ${data.message.match(/Audio file size: (.+)MB/)?.[1] || 'Unknown'} MB`;
          setMessages(prev => {
            if (!prev.some(m => m.includes('Audio file compressed'))) {
              return [...prev, sizeInfo];
            }
            return prev;
          });
        }
      }
      
      // If transcription is completed or failed, stop polling
      if (data.status === 'completed') {
        setPollingActive(false);
        setMessages(prev => [...prev, 'Transcription completed successfully!']);
        if (onComplete) {
          onComplete();
        }
      } else if (data.status === 'failed') {
        setPollingActive(false);
        setMessages(prev => [...prev, `Transcription failed: ${data.error || 'Unknown error'}`]);
      }
    } catch (err: any) {
      // Only set error after multiple retries to avoid flickering
      if (retryCount > 3) {
        setError(err.message || 'Failed to check transcription status');
      }
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // If not transcribing and no status, don't render anything
  if (!isTranscribing && !status) {
    return null;
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Transcription Status</h3>
        <div className="flex items-center gap-2">
          {status && (
            <Badge className={getStatusColor(status.status)}>
              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </Badge>
          )}
          <button 
            onClick={checkStatus} 
            disabled={loading}
            className="p-1 rounded-full hover:bg-slate-200 transition-colors"
            title="Refresh status"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      {status && (
        <Progress value={status.progress} className="h-2 mb-3" />
      )}
      
      {!status && isTranscribing && (
        <Progress value={10} className="h-2 mb-3" />
      )}
      
      {error && (
        <div className="my-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
          {error}
        </div>
      )}
      
      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded p-2 bg-white text-xs font-mono">
        {messages.length === 0 ? (
          <p className="text-slate-400">No status updates yet...</p>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="mb-1 pb-1 border-b border-slate-100 last:border-0">
              {message}
            </div>
          ))
        )}
      </div>
      
      {lastPollTime && (
        <div className="mt-2 text-xs text-slate-400 text-right">
          Last updated: {lastPollTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
} 