"use client";

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Search,
  Zap,
  Target
} from 'lucide-react';
import { AffiliateMatchingService, ProductMatchResult } from '@/lib/services/affiliate-matching';

interface MachineMatcherProps {
  csvData: any[];
  availableMachines: any[];
  onMatchingComplete: (matches: Map<string, string>, isTestMode?: boolean) => void;
  onBack: () => void;
}

interface MatchState {
  [productString: string]: string | null; // product -> machine_id or null
}

interface TableRowProps {
  product: string;
  result: ProductMatchResult | undefined;
  currentMatch: string | null;
  isMatched: boolean;
  topSuggestion: any;
  isSelected: boolean;
  availableMachines: any[];
  handleRowSelection: (product: string, event: React.MouseEvent) => void;
  handleManualMatch: (product: string, machineId: string | null) => void;
  handleAcceptSuggestion: (product: string, machineId: string) => void;
  getConfidenceBadge: (confidence: number) => React.ReactNode;
}

const MemoizedTableRow = memo(function TableRowComponent({
  product,
  result,
  currentMatch,
  isMatched,
  topSuggestion,
  isSelected,
  availableMachines,
  handleRowSelection,
  handleManualMatch,
  handleAcceptSuggestion,
  getConfidenceBadge,
}: TableRowProps) {
  return (
    <TableRow 
      className={isSelected ? 'bg-blue-50 border-blue-200' : ''}
    >
      <TableCell className="text-center">
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={(e) => handleRowSelection(product, e as any)}
          className="cursor-pointer"
        />
      </TableCell>
      <TableCell className="min-w-[300px] max-w-none">
        <div className="break-words" title={product}>
          {product}
        </div>
      </TableCell>
      <TableCell>
        {topSuggestion ? (
          <div className="space-y-1">
            <div className="font-medium">{topSuggestion.machine_name}</div>
            <div className="text-sm text-muted-foreground">
              {topSuggestion.match_reason}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">No suggestions</span>
        )}
      </TableCell>
      <TableCell>
        {topSuggestion && getConfidenceBadge(topSuggestion.confidence_score)}
      </TableCell>
      <TableCell>
        {topSuggestion ? (
          <span className="font-medium">
            ${availableMachines.find(m => m.id === topSuggestion.machine_id)?.Price ? 
              parseFloat(availableMachines.find(m => m.id === topSuggestion.machine_id).Price).toLocaleString() : 
              'N/A'}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell>
        <Select
          value={currentMatch || '__none__'}
          onValueChange={(value) => handleManualMatch(product, value || null)}
        >
          <SelectTrigger className="w-full min-w-[180px]">
            <SelectValue placeholder="Select machine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {availableMachines.map((machine) => (
              <SelectItem key={machine.id} value={machine.id}>
                {machine['Machine Name']}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {isMatched ? (
          <Badge variant="default">Matched</Badge>
        ) : (
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Unmatched</Badge>
            {topSuggestion && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAcceptSuggestion(product, topSuggestion.machine_id)}
              >
                Accept
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
});

export function MachineMatchingInterface({ 
  csvData, 
  availableMachines, 
  onMatchingComplete,
  onBack 
}: MachineMatcherProps) {
  const [matchResults, setMatchResults] = useState<Map<string, ProductMatchResult>>(new Map());
  const [matchState, setMatchState] = useState<MatchState>({});
  const [isProcessing, setIsProcessing] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    matched: 0,
    unmatched: 0,
    confidence_high: 0
  });
  const [showTestPreview, setShowTestPreview] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const [importedProducts, setImportedProducts] = useState<Set<string>>(new Set());

  const matchingService = new AffiliateMatchingService();

  useEffect(() => {
    processMatching();
  }, []);

  const processMatching = async () => {
    setIsProcessing(true);

    // Extract unique products from CSV data
    const products = [...new Set(
      csvData
        .map(row => row.Products || row.products || '')
        .filter(p => p && p.trim())
    )];

    // Process matches
    const results = await matchingService.processBatch(products, availableMachines);
    setMatchResults(results);

    // Initialize match state with auto-matches
    const initialState: MatchState = {};
    let autoMatched = 0;
    let highConfidence = 0;

    results.forEach((result, product) => {
      if (result.exact_match) {
        initialState[product] = result.exact_match.machine_id;
        autoMatched++;
      } else {
        initialState[product] = null;
      }

      if (result.suggested_matches.length > 0 && result.suggested_matches[0].confidence_score > 0.7) {
        highConfidence++;
      }
    });

    setMatchState(initialState);
    setStats({
      total: products.length,
      matched: autoMatched,
      unmatched: products.length - autoMatched,
      confidence_high: highConfidence
    });

    setIsProcessing(false);
  };

  const handleManualMatch = (product: string, machineId: string | null) => {
    const actualMachineId = machineId === '__none__' ? null : machineId;
    setMatchState(prev => ({
      ...prev,
      [product]: actualMachineId
    }));

    // Update stats
    const wasMatched = matchState[product] !== null;
    const isMatched = actualMachineId !== null;

    if (!wasMatched && isMatched) {
      setStats(prev => ({
        ...prev,
        matched: prev.matched + 1,
        unmatched: prev.unmatched - 1
      }));
    } else if (wasMatched && !isMatched) {
      setStats(prev => ({
        ...prev,
        matched: prev.matched - 1,
        unmatched: prev.unmatched + 1
      }));
    }
  };

  const handleAcceptSuggestion = (product: string, machineId: string) => {
    handleManualMatch(product, machineId);
  };

  const handleConfirmAll = () => {
    // Auto-accept all high-confidence suggestions
    const newState = { ...matchState };
    let newMatches = 0;

    matchResults.forEach((result, product) => {
      if (!newState[product] && result.suggested_matches.length > 0) {
        const topMatch = result.suggested_matches[0];
        if (topMatch.confidence_score > 0.7) {
          newState[product] = topMatch.machine_id;
          newMatches++;
        }
      }
    });

    setMatchState(newState);
    setStats(prev => ({
      ...prev,
      matched: prev.matched + newMatches,
      unmatched: prev.unmatched - newMatches
    }));
  };

  // Get final matches for export
  const getFinalMatches = () => {
    const finalMatches = new Map<string, string>();
    
    Object.entries(matchState).forEach(([product, machineId]) => {
      if (machineId) {
        finalMatches.set(product, machineId);
      }
    });

    return finalMatches;
  };

  const finalMatches = getFinalMatches();

  // Get all products in their original order (not filtered by imported)
  const allProducts = Array.from(matchResults.keys());
  
  // Memoize the visible products list to avoid recalculation
  const visibleProducts = useMemo(() => 
    allProducts.filter(p => !importedProducts.has(p)), 
    [allProducts, importedProducts]
  );

  // Batch selection handlers
  const handleRowSelection = useCallback((product: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (event.shiftKey && lastSelected) {
      // Shift+click: select range using visible products only
      const startIndex = visibleProducts.indexOf(lastSelected);
      const endIndex = visibleProducts.indexOf(product);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);
        
        // Build range selection
        const rangeSelection = new Set<string>();
        for (let i = start; i <= end; i++) {
          if (visibleProducts[i]) {
            rangeSelection.add(visibleProducts[i]);
          }
        }
        
        setSelectedRows(rangeSelection);
      }
    } else {
      // Regular click: toggle single row
      setSelectedRows(prevSelected => {
        const newSelected = new Set(prevSelected);
        if (newSelected.has(product)) {
          newSelected.delete(product);
        } else {
          newSelected.add(product);
        }
        return newSelected;
      });
      setLastSelected(product);
    }
  }, [lastSelected, visibleProducts]);

  const handleSelectAll = useCallback(() => {
    setSelectedRows(new Set(visibleProducts));
  }, [visibleProducts]);

  const handleDeselectAll = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const handleBatchImport = async () => {
    const selectedMatches = new Map<string, string>();
    
    selectedRows.forEach(product => {
      const machineId = matchState[product];
      if (machineId) {
        selectedMatches.set(product, machineId);
      }
    });

    // Mark products as imported and remove from view
    const newImported = new Set(importedProducts);
    selectedRows.forEach(product => newImported.add(product));
    setImportedProducts(newImported);
    
    // Clear selection
    setSelectedRows(new Set());
    
    // Update stats
    setStats(prev => ({
      ...prev,
      total: prev.total - selectedRows.size
    }));

    // TODO: Send batch to server for import
    console.log('Batch import:', selectedMatches);
  };

  const handleTestImportClick = () => {
    setShowTestPreview(true);
  };

  const confirmTestImport = () => {
    onMatchingComplete(finalMatches, true);
  };

  const getTestRecords = () => {
    // Get first 10 unique products that have matches
    const testRecords = [];
    let count = 0;
    
    for (const [product, result] of matchResults.entries()) {
      if (count >= 10) break;
      
      const machineId = matchState[product];
      const machine = machineId ? availableMachines.find(m => m.id === machineId) : null;
      const machineName = machine?.['Machine Name'] || 'No match';
      const machinePrice = machine?.Price ? parseFloat(machine.Price).toLocaleString() : null;
      
      testRecords.push({
        product,
        machineId,
        machineName,
        machinePrice,
        hasMatch: !!machineId
      });
      count++;
    }
    
    return testRecords;
  };

  const getConfidenceBadge = useCallback((confidence: number) => {
    if (confidence > 0.8) {
      return <Badge variant="default">{(confidence * 100).toFixed(0)}%</Badge>;
    } else if (confidence > 0.6) {
      return <Badge variant="secondary">{(confidence * 100).toFixed(0)}%</Badge>;
    } else {
      return <Badge variant="outline">{(confidence * 100).toFixed(0)}%</Badge>;
    }
  }, []);

  if (isProcessing) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Search className="h-12 w-12 text-blue-500 mx-auto animate-pulse" />
            <div>
              <h3 className="text-lg font-semibold">Analyzing Products</h3>
              <p className="text-sm text-muted-foreground">
                Matching products to machines using AI pattern recognition...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Products</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
              <p className="text-xs text-muted-foreground">Auto-matched</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.unmatched}</div>
              <p className="text-xs text-muted-foreground">Need Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.confidence_high}</div>
              <p className="text-xs text-muted-foreground">High Confidence</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex justify-between items-center gap-4">
          {/* Left side - Navigation */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={onBack} size="sm">
              ← Back
            </Button>
            <Button variant="outline" onClick={() => {
              sessionStorage.removeItem('affiliate_import_state');
              window.location.reload();
            }} size="sm">
              Reset
            </Button>
          </div>

          {/* Center - Selection Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {selectedRows.size} of {visibleProducts.length} selected
              {selectedRows.size > 0 && (
                <span className="ml-1 text-xs text-blue-600">
                  (shift+click for range)
                </span>
              )}
            </span>
            <Button variant="outline" onClick={handleSelectAll} size="sm">
              Select All
            </Button>
            <Button variant="outline" onClick={handleDeselectAll} size="sm">
              Clear
            </Button>
          </div>

          {/* Right side - Import Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleConfirmAll} size="sm">
              Auto-Match
            </Button>
            <Button 
              onClick={handleBatchImport} 
              disabled={selectedRows.size === 0}
              size="sm"
            >
              Import Selected ({selectedRows.size})
            </Button>
            <Button onClick={() => onMatchingComplete(finalMatches, false)} variant="outline" size="sm">
              Import All
            </Button>
          </div>
        </div>
      </div>

      {/* Matching Results */}
      <div className="w-full">
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">Review Product Matches</h3>
            <p className="text-sm text-gray-600">Confirm machine assignments before importing</p>
          </div>
          <div className="overflow-x-auto">
            <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <input 
                    type="checkbox"
                    onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                    checked={selectedRows.size > 0 && selectedRows.size === Array.from(matchResults.keys()).filter(p => !importedProducts.has(p)).length}
                  />
                </TableHead>
                <TableHead className="w-1/3 min-w-[300px]">Product from CSV</TableHead>
                <TableHead className="w-1/4 min-w-[200px]">Suggested Match</TableHead>
                <TableHead className="w-[100px]">Confidence</TableHead>
                <TableHead className="w-[80px]">Price</TableHead>
                <TableHead className="w-[200px]">Manual Override</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.map((product) => {
                const result = matchResults.get(product);
                const currentMatch = matchState[product];
                const isMatched = currentMatch !== null;
                const topSuggestion = result?.suggested_matches[0];
                const isSelected = selectedRows.has(product);

                return (
                  <MemoizedTableRow
                    key={product}
                    product={product}
                    result={result}
                    currentMatch={currentMatch}
                    isMatched={isMatched}
                    topSuggestion={topSuggestion}
                    isSelected={isSelected}
                    availableMachines={availableMachines}
                    handleRowSelection={handleRowSelection}
                    handleManualMatch={handleManualMatch}
                    handleAcceptSuggestion={handleAcceptSuggestion}
                    getConfidenceBadge={getConfidenceBadge}
                  />
                );
              })}
            </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Test Preview Modal */}
      {showTestPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle>Test Import Preview</CardTitle>
              <CardDescription>
                These are the first 10 records that will be imported for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Matched Machine</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getTestRecords().map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={record.product}>
                          {record.product}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.machineName}
                      </TableCell>
                      <TableCell>
                        {record.machinePrice ? (
                          <span className="font-medium text-green-600">${record.machinePrice}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.hasMatch ? (
                          <Badge className="bg-green-100 text-green-800">Will Import</Badge>
                        ) : (
                          <Badge variant="secondary">No Machine Match</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Test Import Summary:</strong> This will create a test batch with only these 10 records. 
                  You can review the results and then run the full import if everything looks correct.
                </p>
              </div>
            </CardContent>
            <div className="flex justify-between p-6 border-t">
              <Button variant="outline" onClick={() => setShowTestPreview(false)}>
                Cancel
              </Button>
              <Button onClick={confirmTestImport}>
                Confirm Test Import
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}