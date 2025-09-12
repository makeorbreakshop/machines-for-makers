'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function APITestRunner() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests: TestResult[] = [
      { name: 'Generate Q4 2024 Report', status: 'pending' },
      { name: 'Fetch All Reports', status: 'pending' },
      { name: 'Fetch Single Report', status: 'pending' },
      { name: 'Update Report Status', status: 'pending' },
      { name: 'Toggle Public Status', status: 'pending' },
      { name: 'Share Link Generation', status: 'pending' },
      { name: 'Delete Report', status: 'pending' },
      { name: 'Handle Invalid Report ID', status: 'pending' },
      { name: 'Handle Missing Program', status: 'pending' },
    ];

    setTestResults([...tests]);

    // Test 1: Generate Report
    let reportId: string | null = null;
    try {
      updateTest(0, 'running');
      const response = await fetch('/api/admin/affiliate/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: '7b5e9a16-8c3a-4d2e-b1f0-9a8c7d6e5f4a', // xTool program
          quarter: 'Q4',
          year: 2024,
        }),
      });
      const data = await response.json();
      if (response.ok && data.report) {
        reportId = data.report.id;
        updateTest(0, 'success', `Report generated: ${data.report.title}`);
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      updateTest(0, 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Fetch All Reports
    try {
      updateTest(1, 'running');
      const response = await fetch('/api/admin/affiliate/reports');
      const data = await response.json();
      if (response.ok && data.reports) {
        updateTest(1, 'success', `Found ${data.reports.length} reports`);
      } else {
        throw new Error(data.error || 'Failed to fetch reports');
      }
    } catch (error) {
      updateTest(1, 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 3: Fetch Single Report
    if (reportId) {
      try {
        updateTest(2, 'running');
        const response = await fetch(`/api/admin/affiliate/reports/${reportId}`);
        const data = await response.json();
        if (response.ok && data.report) {
          updateTest(2, 'success', `Fetched report: ${data.report.title}`);
        } else {
          throw new Error(data.error || 'Failed to fetch report');
        }
      } catch (error) {
        updateTest(2, 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      updateTest(2, 'error', 'No report ID available for testing');
    }

    // Test 4: Update Report Status
    if (reportId) {
      try {
        updateTest(3, 'running');
        const response = await fetch(`/api/admin/affiliate/reports/${reportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'published' }),
        });
        const data = await response.json();
        if (response.ok) {
          updateTest(3, 'success', 'Report status updated to published');
        } else {
          throw new Error(data.error || 'Failed to update report');
        }
      } catch (error) {
        updateTest(3, 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      updateTest(3, 'error', 'No report ID available for testing');
    }

    // Test 5: Toggle Public Status
    if (reportId) {
      try {
        updateTest(4, 'running');
        const response = await fetch(`/api/admin/affiliate/reports/${reportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_public: true }),
        });
        const data = await response.json();
        if (response.ok) {
          updateTest(4, 'success', 'Report set to public');
        } else {
          throw new Error(data.error || 'Failed to toggle public status');
        }
      } catch (error) {
        updateTest(4, 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      updateTest(4, 'error', 'No report ID available for testing');
    }

    // Test 6: Share Link Generation
    if (reportId) {
      try {
        updateTest(5, 'running');
        const response = await fetch(`/api/admin/affiliate/reports/${reportId}`);
        const data = await response.json();
        if (response.ok && data.report?.share_url) {
          updateTest(5, 'success', `Share URL: ${data.report.share_url}`);
        } else {
          throw new Error('No share URL found');
        }
      } catch (error) {
        updateTest(5, 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      updateTest(5, 'error', 'No report ID available for testing');
    }

    // Test 7: Delete Report (we'll test this last with our generated report)
    // Skip for now, will test at the end
    updateTest(6, 'pending', 'Will test after other tests complete');

    // Test 8: Handle Invalid Report ID
    try {
      updateTest(7, 'running');
      const response = await fetch('/api/admin/affiliate/reports/invalid-id-12345');
      if (response.status === 404 || response.status === 500) {
        updateTest(7, 'success', 'Properly handled invalid ID');
      } else {
        throw new Error('Should return 404 or 500 for invalid ID');
      }
    } catch (error) {
      updateTest(7, 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 9: Handle Missing Program
    try {
      updateTest(8, 'running');
      const response = await fetch('/api/admin/affiliate/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: 'non-existent-program-id',
          quarter: 'Q1',
          year: 2024,
        }),
      });
      if (!response.ok) {
        updateTest(8, 'success', 'Properly handled missing program');
      } else {
        throw new Error('Should fail for non-existent program');
      }
    } catch (error) {
      updateTest(8, 'error', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 7: Delete Report (final test)
    if (reportId) {
      try {
        updateTest(6, 'running');
        const response = await fetch(`/api/admin/affiliate/reports/${reportId}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
          updateTest(6, 'success', 'Test report deleted successfully');
        } else {
          throw new Error(data.error || 'Failed to delete report');
        }
      } catch (error) {
        updateTest(6, 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      updateTest(6, 'error', 'No report ID available for testing');
    }

    setIsRunning(false);

    // Show summary toast
    const successCount = testResults.filter(t => t.status === 'success').length;
    const errorCount = testResults.filter(t => t.status === 'error').length;
    
    if (errorCount === 0) {
      toast({
        title: 'All Tests Passed!',
        description: `${successCount} tests completed successfully.`,
      });
    } else {
      toast({
        title: 'Tests Completed',
        description: `${successCount} passed, ${errorCount} failed.`,
        variant: 'destructive',
      });
    }

    function updateTest(index: number, status: TestResult['status'], message?: string) {
      setTestResults(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status, message };
        return updated;
      });
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Test Suite</CardTitle>
        <CardDescription>
          Run comprehensive tests on all affiliate report API endpoints
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run All Tests'
          )}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-2">
            {testResults.map((test, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2 p-2 rounded-lg bg-gray-50"
              >
                {getStatusIcon(test.status)}
                <div className="flex-1">
                  <div className="font-medium text-sm">{test.name}</div>
                  {test.message && (
                    <div className="text-xs text-gray-600 mt-1">{test.message}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}