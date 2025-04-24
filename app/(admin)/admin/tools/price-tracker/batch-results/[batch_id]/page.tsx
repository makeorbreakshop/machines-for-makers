"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { FileDown, RefreshCw } from "lucide-react";
import { BatchSummaryCard } from "@/app/components/batch-results/batch-summary-card";
import { BatchFilterControls } from "@/app/components/batch-results/batch-filter-controls";
import { BatchResultsTable } from "@/app/components/batch-results/batch-results-table";
import { BatchResultsResponse } from "@/app/api/types/batch";

export default function BatchResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchId = params.batch_id as string;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<BatchResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [showSuccessful, setShowSuccessful] = useState(
    searchParams?.get("showSuccessful") === "true"
  );
  const [showFailed, setShowFailed] = useState(
    searchParams?.get("showFailed") === "true"
  );
  const [showUnchanged, setShowUnchanged] = useState(
    searchParams?.get("showUnchanged") === "true"
  );
  const [showUpdated, setShowUpdated] = useState(
    searchParams?.get("showUpdated") === "true"
  );
  const [showNeedsReview, setShowNeedsReview] = useState(
    searchParams?.get("showNeedsReview") === "true"
  );
  
  // Pagination
  const [page, setPage] = useState(parseInt(searchParams?.get("page") || "1"));
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Auto-refresh for running batches
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  useEffect(() => {
    fetchBatchResults();
    
    // Setup auto-refresh for running batches
    let refreshInterval: NodeJS.Timeout;
    if (autoRefresh && data?.summary.status === 'running') {
      refreshInterval = setInterval(fetchBatchResults, 10000); // Refresh every 10 seconds
    }
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [
    batchId, 
    page, 
    pageSize, 
    showSuccessful, 
    showFailed, 
    showUnchanged, 
    showUpdated, 
    showNeedsReview,
    autoRefresh
  ]);
  
  // Update URL with filters
  useEffect(() => {
    const params = new URLSearchParams();
    if (showSuccessful) params.set("showSuccessful", "true");
    if (showFailed) params.set("showFailed", "true");
    if (showUnchanged) params.set("showUnchanged", "true");
    if (showUpdated) params.set("showUpdated", "true");
    if (showNeedsReview) params.set("showNeedsReview", "true");
    if (page > 1) params.set("page", page.toString());
    
    const url = `/admin/tools/price-tracker/batch-results/${batchId}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    
    router.replace(url);
  }, [
    batchId,
    showSuccessful,
    showFailed,
    showUnchanged,
    showUpdated,
    showNeedsReview,
    page,
    router,
  ]);
  
  async function fetchBatchResults() {
    try {
      if (refreshing) return;
      
      setLoading(prevLoading => !data || prevLoading);
      setRefreshing(!!data);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (showSuccessful) queryParams.set("showSuccessful", "true");
      if (showFailed) queryParams.set("showFailed", "true");
      if (showUnchanged) queryParams.set("showUnchanged", "true");
      if (showUpdated) queryParams.set("showUpdated", "true");
      if (showNeedsReview) queryParams.set("showNeedsReview", "true");
      queryParams.set("page", page.toString());
      queryParams.set("pageSize", pageSize.toString());
      
      const response = await fetch(`/api/v1/batches/${batchId}/results?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching batch results: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
      
      // Set total pages based on total count and page size
      const total = result.summary.totalMachines;
      setTotalPages(Math.ceil(total / pageSize));
      
      // Enable auto-refresh for running batches
      if (result.summary.status === 'running' && !autoRefresh) {
        setAutoRefresh(true);
      } else if (result.summary.status !== 'running' && autoRefresh) {
        setAutoRefresh(false);
      }
    } catch (err) {
      console.error("Failed to fetch batch results", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  
  function handleFilterChange(filter: string, value: boolean) {
    switch (filter) {
      case "showSuccessful":
        setShowSuccessful(value);
        break;
      case "showFailed":
        setShowFailed(value);
        break;
      case "showUnchanged":
        setShowUnchanged(value);
        break;
      case "showUpdated":
        setShowUpdated(value);
        break;
      case "showNeedsReview":
        setShowNeedsReview(value);
        break;
    }
    
    // Reset to page 1 when filters change
    setPage(1);
  }
  
  function handleExport(format: "csv" | "json") {
    window.location.href = `/api/v1/batches/${batchId}/export?format=${format}`;
  }
  
  function handleRefresh() {
    fetchBatchResults();
  }
  
  function handlePageChange(newPage: number) {
    setPage(newPage);
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Batch Results</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={loading}
          >
            <FileDown className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            disabled={loading}
          >
            <FileDown className="mr-2 h-4 w-4" /> Export JSON
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <SkeletonLoader />
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-medium text-red-800">Error Loading Batch Results</h3>
          <p className="text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      ) : data ? (
        <>
          <BatchSummaryCard summary={data.summary} />
          
          <BatchFilterControls
            showSuccessful={showSuccessful}
            showFailed={showFailed}
            showUnchanged={showUnchanged}
            showUpdated={showUpdated}
            showNeedsReview={showNeedsReview}
            onFilterChange={handleFilterChange}
          />
          
          <BatchResultsTable results={data.results} />
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="flex flex-wrap gap-6">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-6 w-24 rounded-md" />
          ))}
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
} 