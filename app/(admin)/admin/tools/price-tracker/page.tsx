"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { PriceHistoryChart } from "@/components/product/price-history-chart"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Check, RefreshCw, Rocket, LineChart, Trash2, AlertCircle, Bug, XCircle, ExternalLink, AlertTriangle, Settings, Plus, Edit } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Script from "next/script"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { SequenceBuilder } from "./components/SequenceBuilder"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"

// Types for API responses
interface Machine {
  id: string;
  machine_name: string;
  brand?: string;
  company?: string;
  product_link?: string;
  current_price?: number;
  previous_price?: number;
  last_updated?: string;
  manual_review_flag?: boolean;
  flag_reason?: string;
  extraction_method?: string;
}

interface PriceHistoryRecord {
  id: string;
  machine_id: string;
  date: string;
  price: number;
  status: 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW';
  source?: string;
  scraped_from_url?: string;
  tier?: string;
  extraction_method?: string;
  validation_basis_price?: number;
  review_reason?: string;
  failure_reason?: string;
  is_all_time_low?: boolean;
  is_all_time_high?: boolean;
  machine?: {
    id: string;
    name?: string;
    machine_name?: string;
    company?: string;
  };
}

interface BatchInfo {
  id: string;
  status: string;
  start_time: string;
  end_time?: string;
  total_machines: number;
  days_threshold: number;
}

interface VariantConfig {
  machine_id: string;
  variant_attribute: string;
  css_price_selector?: string;
  requires_js_interaction?: boolean;
  min_extraction_confidence?: number;
  min_validation_confidence?: number;
  sanity_check_threshold?: number;
  api_endpoint_template?: string;
  js_click_sequence?: any[];
  machines_latest_price?: number;
  last_checked?: string;
}

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000';

export default function PriceTrackerAdmin() {
  // State for machines and UI
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPrices, setUpdatingPrices] = useState<Record<string, boolean>>({});
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [recentlyUpdated, setRecentlyUpdated] = useState<PriceHistoryRecord[]>([]);
  const [filterFeatured, setFilterFeatured] = useState(false);
  
  // Debug and batch states
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [pythonApiReady, setPythonApiReady] = useState(false);
  const [batchUpdateDialogOpen, setBatchUpdateDialogOpen] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState(0);
  const [batchPreviewCount, setBatchPreviewCount] = useState<number | null>(null);
  const [batchPreviewLoading, setBatchPreviewLoading] = useState(false);
  const [machineLimit, setMachineLimit] = useState<number | null>(10);
  const [previewMachineIds, setPreviewMachineIds] = useState<string[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  
  // Configuration state
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [machineConfig, setMachineConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [variants, setVariants] = useState<VariantConfig[]>([]);
  const [newVariant, setNewVariant] = useState({ attribute: "", requires_js: false });
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [jsConfig, setJsConfig] = useState<any[]>([]);
  const [isEditingJs, setIsEditingJs] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  
  const router = useRouter();
  
  // Fetch machines
  useEffect(() => {
    fetchMachines();
  }, [searchTerm, filterFeatured]);
  
  const fetchMachines = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const queryParams = new URLSearchParams();
      if (filterFeatured) {
        queryParams.append('featured', 'true');
      }
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      const response = await fetch(
        `/api/admin/machines?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.error || "Failed to fetch machines");
      }
      
      // Set machines from direct Supabase API
      setMachines(data.machines || []);
    } catch (error) {
      console.error("Error fetching machines:", error);
      toast.error(`Failed to load machines: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch recently updated machines
  useEffect(() => {
    fetchRecentlyUpdated();
  }, [refreshing]);
  
  const fetchRecentlyUpdated = async () => {
    try {
      // Use the direct Supabase API route
      const response = await fetch(
        `/api/admin/price-history?limit=10&sort=date&order=desc&status=SUCCESS`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.error || "Failed to fetch recent updates");
      }
      
      setRecentlyUpdated(data.items || []);
    } catch (error) {
      console.error("Error fetching recent updates:", error);
      toast.error(`Failed to fetch recent updates: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Fetch batch jobs
  useEffect(() => {
    if (pythonApiReady) {
      fetchBatchJobs();
    }
  }, [pythonApiReady, refreshing]);
  
  const fetchBatchJobs = async () => {
    try {
      setLoadingBatches(true);
      
      const response = await fetch(`/api/admin/batches`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching batches: ${response.statusText}`);
      }
      
      const data = await response.json();
      setBatches(data.batches || []);
    } catch (err) {
      console.error("Failed to fetch batches", err);
      toast.error(`Failed to load batch jobs: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoadingBatches(false);
    }
  };
  
  // Select a machine and fetch its price history
  const selectMachine = async (machine: Machine) => {
    setSelectedMachine(machine);
    
    try {
      const response = await fetch(
        `/api/admin/price-history?machine_id=${machine.id}&sort=date&order=desc`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.error || "Failed to fetch price history");
      }
      
      setPriceHistory(data.items || []);
    } catch (error) {
      console.error("Error fetching price history:", error);
      toast.error(`Failed to load price history: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Initial setup for batch preview
  useEffect(() => {
    if (pythonApiReady) {
      previewBatchUpdate(0, machineLimit);
    }
  }, [pythonApiReady, machineLimit]);
  
  // Update a machine price
  const updatePrice = async (machine: Machine) => {
    try {
      // Set loading state for this specific machine
      setUpdatingPrices(prev => ({ ...prev, [machine.id]: true }));
      
      const response = await fetch('/api/admin/tools/price-tracker/extract-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ machineId: machine.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to extract price');
        return;
      }

      const result = await response.json();
      
      // Process result and show dialog
      if (result.success) {
        // Update just this machine in the machines array
        setMachines(prevMachines => prevMachines.map(m => {
          if (m.id === machine.id) {
            return {
              ...m,
              current_price: result.new_price,
              previous_price: result.old_price,
              last_updated: new Date().toISOString(),
              extraction_method: result.extraction_method,
              manual_review_flag: result.needs_review,
              flag_reason: result.review_reason
            };
          }
          return m;
        }));
        
        // Add the new price to the recently updated list without fetching
        setRecentlyUpdated(prev => [{
          id: Date.now().toString(), // Temporary ID for the new record
          machine_id: machine.id,
          date: new Date().toISOString(),
          price: result.new_price,
          status: result.needs_review ? 'NEEDS_REVIEW' : 'SUCCESS',
          validation_basis_price: result.old_price,
          extraction_method: result.extraction_method,
          review_reason: result.review_reason,
          machine: {
            id: machine.id,
            machine_name: machine.machine_name,
            company: machine.company
          }
        }, ...prev.slice(0, 9)]); // Keep only the 10 most recent updates
        
        // Show success message with price change info
        const priceChangeMsg = result.price_change !== 0 
          ? ` (${result.price_change > 0 ? '+' : ''}${formatPrice(result.price_change)})`
          : '';
        toast.success(`Price updated to ${formatPrice(result.new_price)}${priceChangeMsg}`);
        
        // If needs review, show additional toast
        if (result.needs_review) {
          toast.warning(`Price flagged for review: ${result.review_reason}`);
        }
      } else {
        toast.error(result.error || 'Failed to extract price');
      }
      
    } catch (error) {
      console.error('Error extracting price:', error);
      toast.error('Failed to extract price');
    } finally {
      // Clear loading state for this specific machine
      setUpdatingPrices(prev => ({ ...prev, [machine.id]: false }));
    }
  };

  // Debug price extraction
  const handleDebug = async (machine: Machine) => {
    try {
      setDebugInfo(null);
      setDebugDialogOpen(false);
      
      // Show loading toast
      toast.info(`Debugging price extraction for ${machine.machine_name}...`);
      
      // Updated to use the debug-extraction endpoint with new schema support
      const response = await fetch(
        `${API_BASE_URL}/api/v1/debug-extraction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ machine_id: machine.id })
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Process result and show dialog
      if (result.success) {
        // Calculate price changes dynamically based on validation_basis_price
        // Update here: Extract the correct pricing fields from the response
        const oldPrice = result.validation_basis_price || result.old_price || machine.current_price;
        const newPrice = result.price || result.new_price || parseFloat(JSON.stringify(result).match(/"price":\s*(\d+(\.\d+)?)/)?.[1] || '0');
        const priceChange = newPrice - (oldPrice || 0);
        const percentageChange = oldPrice ? (priceChange / oldPrice) * 100 : 0;
        
        console.log("Debug extraction response:", result);
        console.log("Extracted prices - Old:", oldPrice, "New:", newPrice);
        
        // Examine response structure to find any price-related fields
        const allFieldsStr = JSON.stringify(result);
        const priceFields: Record<string, number> = {};
        [
          "price", "new_price", "current_price", "extracted_price", 
          "validation_basis_price", "old_price", "previous_price"
        ].forEach(field => {
          const match = new RegExp(`"${field}":\\s*(\\d+(\\.\\d+)?)`).exec(allFieldsStr);
          if (match) {
            priceFields[field] = parseFloat(match[1]);
          }
        });
        console.log("All detected price fields:", priceFields);
        
        // Find any price-related fields in nested response
        // This recursively checks the entire response object for any price fields
        const findPricesInObject = (obj: any, path = '') => {
          if (!obj || typeof obj !== 'object') return;
          
          for (const key in obj) {
            // Skip special fields like functions or circular references
            if (key === 'debug' || typeof obj[key] === 'function') continue;
            
            const value = obj[key];
            const newPath = path ? `${path}.${key}` : key;
            
            // If we find a price-like field with a number value, add it
            if (typeof value === 'number' && 
                (key.includes('price') || key === 'price' || key.endsWith('_price'))) {
              priceFields[newPath] = value;
              // Directly assign to top-level field for easy access
              if (!priceFields[key]) {
                priceFields[key] = value;
              }
            }
            
            // Recursively check nested objects
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              findPricesInObject(value, newPath);
            }
          }
        };
        
        // Search the entire result object for price fields
        findPricesInObject(result);
        console.log("All detected price fields (including nested):", priceFields);
        
        const finalOldPrice = oldPrice || priceFields.old_price || priceFields.previous_price || priceFields.validation_basis_price;
        const finalNewPrice = newPrice || priceFields.price || priceFields.new_price || priceFields.current_price || priceFields.extracted_price;
        
        const finalPriceChange = finalNewPrice - (finalOldPrice || 0);
        const finalPercentageChange = finalOldPrice ? (finalPriceChange / finalOldPrice) * 100 : 0;
        
        const details = {
          method: result.extraction_method || result.tier || "Unknown method",
          oldPrice: finalOldPrice,
          newPrice: finalNewPrice,
          priceChange: finalPriceChange,
          percentageChange: finalPercentageChange,
          url: result.scraped_from_url || machine.product_link,
          message: result.message,
          debug: result
        };
        
        setDebugInfo({
          success: true,
          machine: machine.machine_name,
          price: finalNewPrice, // Ensure we're using the correct price here
          details: details,
          debug: result
        });
      } else {
        setDebugInfo({
          success: false,
          machine: machine.machine_name,
          error: result.error || result.failure_reason,
          details: {
            url: machine.product_link,
            error: result.error || result.failure_reason,
            debug: result
          },
          debug: result
        });
      }
      
      // Open the debug dialog
      setDebugDialogOpen(true);
    } catch (error) {
      console.error("Error debugging price:", error);
      toast.error("Failed to debug price extraction");
      
      setDebugInfo({
        success: false,
        machine: machine.machine_name,
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          url: machine.product_link,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
      
      setDebugDialogOpen(true);
    }
  };
  
  // Function to trigger batch update dialog
  const updateAllPrices = async () => {
    setBatchUpdateDialogOpen(true);
    setBatchPreviewCount(null);
    previewBatchUpdate(0, machineLimit);
  };
  
  // Preview batch update (count of machines)
  const previewBatchUpdate = async (days: number, limit: number | null = null) => {
    try {
      setBatchPreviewLoading(true);
      
      // Updated to use the new batch-configure endpoint that reflects the new schema
      const response = await fetch(
        `${API_BASE_URL}/api/v1/batch-configure`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            days_threshold: days, // Still pass days, but backend may ignore it depending on implementation
            limit
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to preview batch update");
      }
      
      setBatchPreviewCount(data.configuration?.machine_count || 0);
      setPreviewMachineIds(data.configuration?.machine_ids || []);
    } catch (error) {
      console.error("Error previewing batch update:", error);
      setBatchPreviewCount(0);
      setPreviewMachineIds([]);
      toast.error(`Failed to preview batch update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setBatchPreviewLoading(false);
    }
  };
  
  // Execute the batch update after confirmation
  const executeBatchUpdate = async () => {
    try {
      toast.info(`Starting ${isDryRun ? "dry run " : ""}batch update with Python API...`);
      
      // Set batch parameters according to updated API requirements
      const batchParams = { 
        days_threshold: daysThreshold, // Use the actual days threshold from the form
        limit: machineLimit,
        machine_ids: previewMachineIds,
        dry_run: isDryRun,
        flags_for_review: true,
        save_to_db: !isDryRun,
        create_batch_record: true,
        sanity_check_threshold: 25
      };
      
      console.log("Batch update parameters:", batchParams);
      
      // The batch-update endpoint now writes directly to price_history and updates machines_latest
      const response = await fetch(
        `${API_BASE_URL}/api/v1/batch-update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batchParams)
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const batchResult = await response.json();
      
      if (!batchResult.success) {
        throw new Error(batchResult.error || "Batch update failed");
      }
      
      console.log("Batch update response:", batchResult);
      
      // Show appropriate message based on dry run status
      if (isDryRun && batchResult.log_file) {
        toast.success(
          <div>
            <p>Python API dry run batch update started in the background</p>
            <p className="mt-2">Results will be saved to: <code className="bg-gray-100 px-1 py-0.5 rounded">{batchResult.log_file}</code></p>
          </div>,
          { duration: 8000 }
        );
      } else {
        const batchMessage = batchResult.batch_id 
          ? `Batch update started with ID: ${batchResult.batch_id}`
          : `Batch update started in the background`;
        
        toast.success(batchMessage, { duration: 8000 });
      }
      
      setBatchUpdateDialogOpen(false);
      
      // Wait a bit before refreshing data
      setTimeout(() => {
        fetchBatchJobs();
        setRefreshing(prev => !prev);
      }, 5000);
    } catch (error) {
      console.error("Error starting batch update:", error);
      toast.error(`Failed to start batch update: ${error instanceof Error ? error.message : "Unknown error"}`);
      setBatchUpdateDialogOpen(false);
    }
  };

  // Delete a price history record
  const deletePrice = async (recordId: string) => {
    try {
      const apiUrl = API_BASE_URL;
      
      // Updated to use the new price-history DELETE endpoint
      const response = await fetch(
        `${apiUrl}/api/v1/price-history/${recordId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete price record");
      }
      
      toast.success("Price record deleted");
      
      // Refresh data
      setRefreshing(prev => !prev);
      
      // If this is part of the selected machine's history, refresh that too
      if (selectedMachine) {
        selectMachine(selectedMachine);
      }
    } catch (error) {
      console.error("Error deleting price record:", error);
      toast.error(`Failed to delete price record: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Clean up invalid price records
  const cleanupInvalidPrices = async () => {
    if (!window.confirm("This will remove all price records with values less than $10. Continue?")) {
      return;
    }
    
    try {
      const apiUrl = API_BASE_URL;
      
      // Updated to use the new price-history/cleanup endpoint
      const response = await fetch(
        `${apiUrl}/api/v1/price-history/cleanup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            min_price: 10
          })
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to clean up price records");
      }
      
      const message = result.records_deleted > 0
        ? `Removed ${result.records_deleted} invalid price records`
        : "No invalid price records found";
        
      toast.success(message);
      
      // Refresh data
      setRefreshing(prev => !prev);
      
      // If we have a selected machine, refresh that too
      if (selectedMachine) {
        selectMachine(selectedMachine);
      }
    } catch (error) {
      console.error("Error cleaning up price records:", error);
      toast.error(`Failed to clean up price records: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Confirm a new price
  const confirmPrice = async (machineId: string, newPrice: number) => {
    try {
      // Updated to use the confirm-price endpoint that creates a new record in price_history with SUCCESS status
      const response = await fetch(
        `${API_BASE_URL}/api/v1/machines/${machineId}/confirm-price`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            price: newPrice
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to confirm price");
      }
      
      toast.success(`Price updated to ${formatPrice(newPrice)}`);
      
      // Refresh data
      setRefreshing(prev => !prev);
      
      return true;
    } catch (error) {
      console.error("Error confirming price:", error);
      toast.error(`Failed to confirm price: ${error instanceof Error ? error.message : "Unknown error"}`);
      return false;
    }
  };
  
  // Open configuration dialog
  const openConfigDialog = async (machine: Machine) => {
    if (!machine) return;
    
    setSelectedMachine(machine);
    setConfigLoading(true);
    setMachineConfig(null);
    setVariants([]);
    
    try {
      // Fetch both the specific config and the list of all variants
      const [configResponse, variantsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/machines/${machine.id}/config`),
        fetch(`${API_BASE_URL}/api/v1/machines/${machine.id}/variants`)
      ]);
      
      if (!configResponse.ok) {
        throw new Error(`Failed to fetch machine config: ${configResponse.statusText}`);
      }
      if (!variantsResponse.ok) {
        throw new Error(`Failed to fetch machine variants: ${variantsResponse.statusText}`);
      }
      
      const configData = await configResponse.json();
      const variantsData = await variantsResponse.json();
      
      if (!configData.success) {
        throw new Error(configData.error || 'Failed to fetch machine configuration');
      }
      if (!variantsData.success) {
        throw new Error(variantsData.error || 'Failed to fetch machine variants');
      }
      
      setMachineConfig(configData.config || {});
      setVariants(variantsData.variants || []);
      
      // Set JS config if available
      if (configData.config?.js_click_sequence) {
        setJsConfig(configData.config.js_click_sequence);
      }
      
      setConfigDialogOpen(true);
    } catch (error) {
      console.error("Error opening machine config dialog:", error);
      toast.error(`Failed to load machine configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setConfigLoading(false);
    }
  };
  
  // Save machine configuration
  const handleSaveConfig = async () => {
    if (!selectedMachine) return;
    
    try {
      // Format JS config if needed
      let formattedJsConfig = jsConfig;
      if (jsConfig && Array.isArray(jsConfig)) {
        const needsConversion = jsConfig.some((step: any) => 'type' in step && !('action' in step));
        if (needsConversion) {
          formattedJsConfig = jsConfig.map((step: any) => {
            if ('type' in step) {
              return {
                action: step.type,
                selector: step.selector,
                time: step.time
              };
            }
            return step;
          });
        }
      }
      
      // Create the config payload
      const configPayload = {
        config: {
          css_price_selector: machineConfig?.css_price_selector || null,
          requires_js_interaction: machineConfig?.requires_js_interaction || false,
          min_extraction_confidence: machineConfig?.min_extraction_confidence || 0.85,
          min_validation_confidence: machineConfig?.min_validation_confidence || 0.90,
          sanity_check_threshold: machineConfig?.sanity_check_threshold || 0.25,
          api_endpoint_template: machineConfig?.api_endpoint_template || null,
          js_click_sequence: machineConfig?.requires_js_interaction && formattedJsConfig && formattedJsConfig.length > 0 
            ? formattedJsConfig 
            : null
        }
      };
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/machines/${selectedMachine.id}/config`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(configPayload)
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save configuration');
      }
      
      toast.success("Configuration saved successfully");
      setConfigDialogOpen(false);
      
      // Refresh data
      setRefreshing(prev => !prev);
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error(`Failed to save configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Add a variant
  const handleAddVariant = async () => {
    if (!selectedMachine || !newVariant.attribute) return;
    
    try {
      // Encode the variant attribute for the URL
      const encodedVariantAttribute = encodeURIComponent(newVariant.attribute);
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/machines/${selectedMachine.id}/variants?variant_attribute=${encodedVariantAttribute}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to add variant: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to add variant');
      }
      
      if (data.variant) {
        setVariants([...variants, data.variant]);
      } else {
        console.error("API success but variant data missing in response:", data);
        toast.error("Failed to add variant: API response missing variant data.");
      }
      
      setNewVariant({ attribute: "", requires_js: false });
      setIsAddingVariant(false);
      toast.success("Variant added successfully");
    } catch (error) {
      console.error("Error adding variant:", error);
      toast.error(`Failed to add variant: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Delete a variant
  const handleDeleteVariant = async (variantId: string) => {
    if (!selectedMachine) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/machines/${selectedMachine.id}/variants/${variantId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to delete variant: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete variant');
      }
      
      setVariants(variants.filter(v => v.variant_attribute !== variantId));
      toast.success("Variant deleted successfully");
    } catch (error) {
      console.error("Error deleting variant:", error);
      toast.error(`Failed to delete variant: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  };
  
  // Format price for display
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(price);
  };
  
  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get batch status badge
  const getBatchStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case 'in_progress':
      case 'started':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">In Progress</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
    }
  };
  
  // Get status badge for price history records
  const getPriceHistoryStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Success</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      case 'NEEDS_REVIEW':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Needs Review</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
    }
  };
  
  // Handle API script loaded
  const handleScriptLoad = () => {
    setPythonApiReady(true);
    console.log("Python Price Extractor API script loaded");
    toast.success("Python Price Extractor API connected");
  };
  
  // Handle API script error
  const handleScriptError = () => {
    console.error("Failed to load Python Price Extractor API script");
    toast.error("Failed to connect to Python Price Extractor API");
  };
  
  // Test machine configuration
  const handleTestConfig = async () => {
    if (!selectedMachine) return;
    
    try {
      toast.info(`Testing configuration for ${selectedMachine.machine_name}...`);
      
      // If JS interaction is enabled, test that specifically
      if (machineConfig?.requires_js_interaction && jsConfig) {
        toast.info("Testing JavaScript interaction sequence...");
        
        // Check if the sequence contains an extract step
        const hasExtractStep = jsConfig.some((step: any) => 
          (step.action === 'extract' || step.type === 'extract')
        );
        
        // Use browser extract endpoint for local testing with extract step
        if (hasExtractStep) {
          // Format sequence for the browser extract endpoint
          const formattedSequence = jsConfig.map((step: any) => ({
            type: step.action || step.type,
            selector: step.selector,
            time: step.time,
            ...(step.position && { position: step.position })
          }));
          
          const response = await fetch('/api/browser/extract', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: selectedMachine.product_link,
              actions: formattedSequence
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to test sequence: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // Check extraction results
          const extractResult = data.results.find((r: any) => 
            r.action.type === 'extract' || r.action.action === 'extract'
          );
          
          if (extractResult?.extraction?.found) {
            toast.success(`Local test successful! Extracted price: ${extractResult.extraction.prices.map((p: any) => p.parsed).join(', ')}`);
          } else if (data.priceInfo?.found) {
            toast.info(`No direct price found, but detected prices: ${data.priceInfo.commonSelectors.prices.join(', ')}`);
          } else {
            toast.error('Local test failed to extract price. Check your selectors and sequence.');
          }
          
          return;
        }
        
        // Test JS interaction with backend API
        const response = await fetch(`${API_BASE_URL}/api/v1/machines/test-js-interaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: selectedMachine.product_link,
            jsClickSequence: jsConfig,
            variantAttribute: 'DEFAULT'
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to test JS interaction: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          toast.error(`JavaScript test failed: ${data.error || 'Unknown error'}`);
          return;
        }
        
        toast.success(`JavaScript test successful! Extracted price: ${formatPrice(data.price)}`);
        return;
      }
      
      // Test general configuration
      const response = await fetch(`${API_BASE_URL}/api/v1/extract-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          machine_id: selectedMachine.id,
          test_mode: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to test configuration: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        toast.error(`Test failed: ${data.error || 'Unknown error'}`);
        return;
      }
      
      // Use the helper function to extract price information
      const priceInfo = extractPriceInformation(data, selectedMachine);
      
      toast.success(`Test successful! Extracted price: ${formatPrice(priceInfo.newPrice)}`);
    } catch (error) {
      console.error("Error testing configuration:", error);
      toast.error(`Failed to test configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Listen for messages from the recording window
  useEffect(() => {
    const handleRecordingMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data !== 'object' || !event.data.type) return;
        
        if (event.data.type === 'SEQUENCE_RECORDED' && event.data.sequence) {
          // Update the jsConfig with the recorded sequence
          setJsConfig(event.data.sequence);
          toast.success('Sequence imported from recording window');
        }
      } catch (error) {
        console.error('Error processing message from recording window:', error);
      }
    };
    
    window.addEventListener('message', handleRecordingMessage);
    return () => window.removeEventListener('message', handleRecordingMessage);
  }, []);

  // Function to handle rendering of recent update table rows with dynamic price change calculation
  const renderRecentUpdateRow = (record: PriceHistoryRecord) => {
    // Calculate price change information dynamically
    const oldPrice = record.validation_basis_price;
    const newPrice = record.price;
    const priceChange = oldPrice !== undefined ? newPrice - oldPrice : 0;
    const priceChangeClass = priceChange > 0 
      ? 'text-red-500' 
      : priceChange < 0 
        ? 'text-green-500' 
        : '';
        
    return (
      <TableRow key={record.id}>
        <TableCell className="font-medium">
          <div className="flex flex-col">
            <span className="font-medium">{record.machine?.name || record.machine?.machine_name || 'Unknown Machine'}</span>
            <span className="text-sm text-gray-500">{record.machine?.company || ''}</span>
          </div>
        </TableCell>
        <TableCell>{formatPrice(oldPrice)}</TableCell>
        <TableCell>
          {formatPrice(newPrice)}
          {priceChange !== 0 && (
            <span className={`ml-2 text-sm ${priceChangeClass}`}>
              ({priceChange > 0 ? '+' : ''}
              {formatPrice(priceChange)})
            </span>
          )}
        </TableCell>
        <TableCell>{formatDate(record.date)}</TableCell>
        <TableCell>
          {getPriceHistoryStatusBadge(record.status)}
        </TableCell>
        <TableCell className="text-right">
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this price record?")) {
                deletePrice(record.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  // Helper function to extract price information from any API response
  const extractPriceInformation = (result: any, machine: Machine) => {
    console.log("Extracting price information from response:", result);
    
    // Examine response structure to find any price-related fields
    const allFieldsStr = JSON.stringify(result);
    const priceFields: Record<string, number> = {};
    [
      "price", "new_price", "current_price", "extracted_price", 
      "validation_basis_price", "old_price", "previous_price"
    ].forEach(field => {
      const match = new RegExp(`"${field}":\\s*(\\d+(\\.\\d+)?)`).exec(allFieldsStr);
      if (match) {
        priceFields[field] = parseFloat(match[1]);
      }
    });
    console.log("All detected price fields:", priceFields);
    
    // Find any price-related fields in nested response
    const findPricesInObject = (obj: any, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      for (const key in obj) {
        // Skip special fields like functions or circular references
        if (key === 'debug' || typeof obj[key] === 'function') continue;
        
        const value = obj[key];
        const newPath = path ? `${path}.${key}` : key;
        
        // If we find a price-like field with a number value, add it
        if (typeof value === 'number' && 
            (key.includes('price') || key === 'price' || key.endsWith('_price'))) {
          priceFields[newPath] = value;
          // Directly assign to top-level field for easy access
          if (!priceFields[key]) {
            priceFields[key] = value;
          }
        }
        
        // Recursively check nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          findPricesInObject(value, newPath);
        }
      }
    };
    
    // Search the entire result object for price fields
    findPricesInObject(result);
    console.log("All detected price fields (including nested):", priceFields);
    
    // Extract old and new prices using all possible field names
    const oldPrice = result.validation_basis_price || result.old_price || 
                    priceFields.validation_basis_price || priceFields.old_price || 
                    priceFields.previous_price || machine.current_price;
                    
    const newPrice = result.price || result.new_price || 
                    priceFields.price || priceFields.new_price || 
                    priceFields.current_price || priceFields.extracted_price;
    
    const priceChange = newPrice - (oldPrice || 0);
    const percentageChange = oldPrice ? (priceChange / oldPrice) * 100 : 0;
    
    return {
      oldPrice,
      newPrice,
      priceChange,
      percentageChange,
      method: result.extraction_method || result.tier || "Unknown method",
      url: result.scraped_from_url || machine.product_link,
      message: result.message
    };
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Price Tracker</h1>
          <p className="text-muted-foreground">
            Manage and track prices for machines
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            asChild
            className="flex items-center gap-2"
          >
            <Link href="/admin/tools/price-tracker/price-history">
              <LineChart className="h-4 w-4" /> Price History
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            asChild
            className="flex items-center gap-2"
          >
            <Link href="/admin/tools/price-tracker/review">
              <AlertTriangle className="h-4 w-4" /> Review Queue
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            asChild
            className="flex items-center gap-2"
          >
            <Link href="/admin/tools/price-tracker/batch-results">
              <LineChart className="h-4 w-4" /> Batch Results
            </Link>
          </Button>
          
          <Button
            onClick={() => setBatchUpdateDialogOpen(true)}
            className="flex items-center gap-2"
            disabled={!pythonApiReady}
          >
            <Rocket className="h-4 w-4" /> Batch Update
          </Button>
        </div>
      </div>
      
      <Script 
        src="/admin/tools/price-tracker/price-tracker-api.js"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Price Tracker Admin</h1>
        <Button onClick={updateAllPrices}>
          <Bug className="w-4 h-4 mr-2" />
          Extract All Prices
        </Button>
      </div>
      
      <p className="text-gray-500">
        Manage and test the price tracking feature. You can extract prices manually or view price history.
      </p>
      
      <Tabs defaultValue="machines">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="batch-jobs">Batch Jobs</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="machines">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Machines</CardTitle>
                  <CardDescription>Manage and track machines</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setRefreshing(prev => !prev)}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-4">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : machines.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No machines found</p>
                  <p className="text-sm mt-2">Start adding machines</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine Name</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machines.map((machine) => (
                      <TableRow 
                        key={machine.id}
                        className={`cursor-pointer hover:bg-gray-50 ${selectedMachine?.id === machine.id ? 'bg-blue-50' : ''}`}
                        onClick={() => selectMachine(machine)}
                      >
                        <TableCell className="font-medium">{machine.machine_name}</TableCell>
                        <TableCell>{machine.brand}</TableCell>
                        <TableCell>{machine.company}</TableCell>
                        <TableCell>{formatPrice(machine.current_price)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePrice(machine);
                              }}
                              disabled={updatingPrices[machine.id]}
                            >
                              {updatingPrices[machine.id] ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Update Price
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDebug(machine);
                              }}
                            >
                              <Bug className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="batch-jobs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Batch Price Update Jobs</CardTitle>
                  <CardDescription>View and manage batch price update operations</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setRefreshing(prev => !prev)}
                  disabled={loadingBatches}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingBatches ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBatches ? (
                <div className="flex justify-center p-4">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No batch jobs found</p>
                  <p className="text-sm mt-2">Start a new batch update using the "Extract All Prices" button</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Machines</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      // Calculate duration if available
                      const duration = batch.start_time && batch.end_time 
                        ? new Date(batch.end_time).getTime() - new Date(batch.start_time).getTime() 
                        : null;
                      
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono text-xs">{batch.id}</TableCell>
                          <TableCell>{getBatchStatusBadge(batch.status)}</TableCell>
                          <TableCell>{batch.total_machines || 'N/A'}</TableCell>
                          <TableCell>
                            {batch.start_time 
                              ? <span title={new Date(batch.start_time).toLocaleString()}>
                                  {formatRelativeTime(batch.start_time)}
                                </span>
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>
                            {duration 
                              ? `${Math.floor(duration / 1000)} seconds`
                              : batch.status.toLowerCase() === 'completed' 
                                ? 'Unknown' 
                                : 'In progress'
                            }
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              asChild
                            >
                              <a href={`/admin/tools/price-tracker/batch-results?batch_id=${batch.id}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Chart Preview</CardTitle>
              <CardDescription>
                Preview how the price history chart will look on product pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedMachine ? (
                <div className="max-w-xl mx-auto">
                  <PriceHistoryChart 
                    machineId={selectedMachine.id}
                    currentPrice={selectedMachine.current_price ?? null}
                  />
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <LineChart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="mb-4">Select a machine to preview its price history chart.</p>
                  <Button variant="outline" onClick={() => {
                    const tabsElement = document.querySelector('[data-value="machines"]') as HTMLElement;
                    if (tabsElement) tabsElement.click();
                  }}>
                    Select a Machine
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialogs will go here */}
      
      {/* Debug Dialog */}
      <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {debugInfo?.success ? (
                <span className="flex items-center">
                  <Check className="w-5 h-5 mr-2 text-green-500" />
                  Price Extraction Debug: {debugInfo?.machine}
                </span>
              ) : (
                <span className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                  Price Extraction Failed: {debugInfo?.machine}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {debugInfo?.success ? (
                `Successfully extracted price: ${formatPrice(debugInfo?.price)}`
              ) : (
                `Error: ${debugInfo?.error}`
              )}
            </DialogDescription>
          </DialogHeader>
          
          {debugInfo && (
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                {debugInfo.success && debugInfo.details && (
                  <AccordionItem value="price-info">
                    <AccordionTrigger>Price Information</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">Method Used:</div>
                        <div>{debugInfo.details.method || "Unknown"}</div>
                        
                        <div className="font-medium">Previous Price:</div>
                        <div>{formatPrice(debugInfo.details.oldPrice)}</div>
                        
                        <div className="font-medium">New Price:</div>
                        <div>{formatPrice(debugInfo.details.newPrice)}</div>
                        
                        <div className="font-medium">Price Change:</div>
                        <div className={`${debugInfo.details.priceChange > 0 ? 'text-red-600' : debugInfo.details.priceChange < 0 ? 'text-green-600' : ''}`}>
                          {formatPrice(debugInfo.details.priceChange)} 
                          ({debugInfo.details.percentageChange > 0 ? '+' : ''}{debugInfo.details.percentageChange.toFixed(2)}%)
                        </div>
                        
                        <div className="font-medium">Source URL:</div>
                        <div className="break-all">
                          <a href={debugInfo.details.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center">
                            {debugInfo.details.url?.substring(0, 50)}...
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                
                <AccordionItem value="debug-info">
                  <AccordionTrigger>Technical Debug Information</AccordionTrigger>
                  <AccordionContent>
                    <div className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                      {JSON.stringify(debugInfo.debug, null, 2)}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              {/* Only show confirmation section for successful price extractions that aren't debugging */}
              {debugInfo.success && debugInfo.details && !debugInfo.debug?.is_debug_mode && (
                <div className="mt-6 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h3 className="text-lg font-medium mb-2">Confirm Price Update</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Do you want to update the price from {formatPrice(debugInfo.details.oldPrice)} to {formatPrice(debugInfo.details.newPrice)}?
                    </p>
                    
                    <div className="flex items-center justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setDebugDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={async () => {
                          try {
                            setDebugDialogOpen(false);
                            
                            // Call the confirmPrice function with the machine ID and new price
                            if (selectedMachine) {
                              await confirmPrice(selectedMachine.id, debugInfo.details.newPrice);
                            }
                          } catch (error) {
                            console.error("Error confirming price:", error);
                            toast.error("Failed to confirm price update");
                          }
                        }}
                      >
                        Confirm Update
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {debugInfo.success && debugInfo.details && debugInfo.details.confirmed && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 mr-2" />
                    <span>Price has been successfully updated in the database.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Batch Update Dialog */}
      <Dialog open={batchUpdateDialogOpen} onOpenChange={setBatchUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Batch Update Configuration</DialogTitle>
            <DialogDescription>
              Configure and start a batch price update for machines.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="days-threshold">Update machines not updated in the last:</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="days-threshold"
                  type="number"
                  min="0"
                  value={daysThreshold}
                  onChange={(e) => {
                    const days = parseInt(e.target.value);
                    setDaysThreshold(isNaN(days) ? 0 : days);
                    previewBatchUpdate(days, machineLimit);
                  }}
                  className="w-24"
                />
                <span>days</span>
              </div>
              <p className="text-sm text-gray-500">
                Set to 0 to include all machines regardless of last update time.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="machine-limit">Limit number of machines to process:</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="machine-limit"
                  type="number"
                  min="1"
                  max="100"
                  value={machineLimit !== null ? machineLimit : ''}
                  onChange={(e) => {
                    const limit = parseInt(e.target.value);
                    setMachineLimit(isNaN(limit) ? null : limit);
                    previewBatchUpdate(daysThreshold, isNaN(limit) ? null : limit);
                  }}
                  className="w-24"
                />
                <span>machines</span>
              </div>
              <p className="text-sm text-gray-500">
                Limit the number of machines to process in this batch.
              </p>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="dry-run"
                checked={isDryRun}
                onCheckedChange={(checked) => {
                  setIsDryRun(checked === true);
                }}
              />
              <Label htmlFor="dry-run">Dry run (simulation only, no database updates)</Label>
            </div>
            
            <div className="mt-4">
              <h3 className="font-medium mb-2">Batch Preview:</h3>
              {batchPreviewLoading ? (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading preview...</span>
                </div>
              ) : (
                <p className="text-sm">
                  {batchPreviewCount === 0 
                    ? "No machines match the current criteria."
                    : batchPreviewCount === null
                      ? "Enter criteria to preview batch update."
                      : `${batchPreviewCount} machine${batchPreviewCount === 1 ? '' : 's'} will be updated.`
                  }
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setBatchUpdateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={executeBatchUpdate}
              disabled={batchPreviewLoading || batchPreviewCount === 0}
            >
              Start Batch Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMachine ? `Configure ${selectedMachine.machine_name}` : 'Machine Configuration'}
            </DialogTitle>
            <DialogDescription>
              Configure extraction settings, variants, and JavaScript interaction
            </DialogDescription>
          </DialogHeader>
          
          {configLoading ? (
            <div className="flex justify-center items-center h-32">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                  <TabsTrigger value="js">JavaScript Interaction</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="css-selector">CSS Selector for Price:</Label>
                      <Input
                        id="css-selector"
                        placeholder="CSS selector for price element"
                        value={machineConfig?.css_price_selector || ''}
                        onChange={(e) => setMachineConfig({...machineConfig, css_price_selector: e.target.value})}
                      />
                      <p className="text-xs text-gray-500">
                        Custom CSS selector to extract price from the HTML (optional)
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="min-extraction-confidence">Min Extraction Confidence:</Label>
                        <Input
                          id="min-extraction-confidence"
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          placeholder="0.75"
                          value={machineConfig?.min_extraction_confidence || ''}
                          onChange={(e) => setMachineConfig({...machineConfig, min_extraction_confidence: parseFloat(e.target.value)})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="min-validation-confidence">Min Validation Confidence:</Label>
                        <Input
                          id="min-validation-confidence"
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          placeholder="0.75"
                          value={machineConfig?.min_validation_confidence || ''}
                          onChange={(e) => setMachineConfig({...machineConfig, min_validation_confidence: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sanity-check-threshold">Sanity Check Threshold (%):</Label>
                      <Input
                        id="sanity-check-threshold"
                        type="number"
                        min="0"
                        placeholder="20"
                        value={machineConfig?.sanity_check_threshold || ''}
                        onChange={(e) => setMachineConfig({...machineConfig, sanity_check_threshold: parseInt(e.target.value)})}
                      />
                      <p className="text-xs text-gray-500">
                        Maximum allowed price change percentage before requiring manual review (e.g. 20 for 20%)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="api-endpoint">API Endpoint Template:</Label>
                      <Input
                        id="api-endpoint"
                        placeholder="https://example.com/api/product/{id}/price"
                        value={machineConfig?.api_endpoint_template || ''}
                        onChange={(e) => setMachineConfig({...machineConfig, api_endpoint_template: e.target.value})}
                      />
                      <p className="text-xs text-gray-500">
                        Custom API endpoint template for products with price APIs (optional)
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="variants" className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variant Name</TableHead>
                          <TableHead>Last Checked</TableHead>
                          <TableHead>Current Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variants.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              No variants configured
                            </TableCell>
                          </TableRow>
                        ) : (
                          variants.map((variant) => (
                            <TableRow key={variant.variant_attribute}>
                              <TableCell>{variant.variant_attribute || "Default"}</TableCell>
                              <TableCell>
                                {variant.last_checked 
                                  ? formatRelativeTime(variant.last_checked)
                                  : "Never"
                                }
                              </TableCell>
                              <TableCell>{formatPrice(variant.machines_latest_price)}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteVariant(variant.variant_attribute)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {isAddingVariant ? (
                    <div className="space-y-4 p-4 border rounded-md">
                      <h3 className="font-medium">Add New Variant</h3>
                      <div className="space-y-2">
                        <Label htmlFor="variant-attribute">Variant Attribute:</Label>
                        <Input
                          id="variant-attribute"
                          placeholder="e.g. 'Pro', '10W', 'Bundle'"
                          value={newVariant.attribute}
                          onChange={(e) => setNewVariant({...newVariant, attribute: e.target.value})}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requires-js"
                          checked={newVariant.requires_js}
                          onCheckedChange={(checked) => {
                            setNewVariant({...newVariant, requires_js: checked === true});
                          }}
                        />
                        <Label htmlFor="requires-js">Requires JavaScript Interaction</Label>
                      </div>
                      
                      <div className="flex space-x-2 justify-end">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setNewVariant({ attribute: "", requires_js: false });
                            setIsAddingVariant(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleAddVariant}>
                          Add Variant
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setIsAddingVariant(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add Variant
                    </Button>
                  )}
                </TabsContent>
                
                <TabsContent value="js" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="js-interaction">JavaScript Interaction Sequence:</Label>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsEditingJs(!isEditingJs);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {isEditingJs ? "Cancel Editing" : "Edit Sequence"}
                      </Button>
                    </div>
                    
                    {isEditingJs ? (
                      <>
                        <div className="border rounded-md p-4">
                          <div className="mb-4">
                            <h3 className="text-sm font-medium mb-2">JavaScript Click Sequence Builder</h3>
                            <p className="text-xs text-gray-500 mb-4">
                              Configure a sequence of click actions to navigate to the price on JavaScript-heavy sites.
                            </p>
                            
                            <div className="mt-4">
                              <SequenceBuilder 
                                initialSequence={jsConfig} 
                                onChange={setJsConfig}
                                onTest={handleTestConfig}
                                productUrl={selectedMachine?.product_link || ''}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="border rounded-md p-4 bg-gray-50">
                        {machineConfig?.requires_js_interaction ? (
                          <>
                            <p className="mb-2 text-sm">JavaScript interaction is enabled for this machine.</p>
                            {jsConfig && jsConfig.length > 0 ? (
                              <div className="text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-gray-100 p-2 rounded">
                                {JSON.stringify(jsConfig, null, 2)}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No click sequence configured.</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">JavaScript interaction is disabled for this machine.</p>
                        )}
                        
                        <div className="mt-4 flex items-center space-x-2">
                          <Checkbox
                            id="requires-js-interaction"
                            checked={machineConfig?.requires_js_interaction || false}
                            onCheckedChange={(checked) => {
                              setMachineConfig({
                                ...machineConfig,
                                requires_js_interaction: checked === true
                              });
                            }}
                          />
                          <Label htmlFor="requires-js-interaction">
                            Enable JavaScript interaction
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="flex space-x-2 justify-between">
                <div>
                  <Button 
                    variant="outline" 
                    onClick={handleTestConfig}
                  >
                    Test Configuration
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setConfigDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConfig}>
                    Save Configuration
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 