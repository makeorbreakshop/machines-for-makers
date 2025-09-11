"use client";

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Download,
  Eye,
  Trash2
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { CSVPreview } from './csv-preview';
import { MachineMatchingInterface } from './machine-matcher-fast';

interface Program {
  id: string;
  name: string;
  brands: {
    Name: string;
    Slug: string;
  };
}

interface ImportBatch {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  imported_at: string;
  affiliate_programs: {
    name: string;
    brands: {
      Name: string;
    };
  };
}

interface ImportWizardProps {
  programs: Program[];
  recentImports: ImportBatch[];
}

export function ImportWizard({ programs, recentImports }: ImportWizardProps) {
  const { toast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [fullCsvData, setFullCsvData] = useState<any[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'matching' | 'complete'>('upload');
  const [importResult, setImportResult] = useState<any>(null);
  const [availableMachines, setAvailableMachines] = useState<any[]>([]);
  const [machineMatches, setMachineMatches] = useState<Map<string, string>>(new Map());

  // Cache keys for session storage
  const getCacheKey = (filename: string) => `affiliate_import_${filename.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  // Load cached data on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('affiliate_import_state');
      if (cached) {
        const state = JSON.parse(cached);
        if (state.selectedProgram) setSelectedProgram(state.selectedProgram);
        if (state.currentStep) setCurrentStep(state.currentStep);
        if (state.csvData) setCsvData(state.csvData);
        if (state.fullCsvData) setFullCsvData(state.fullCsvData);
        if (state.availableMachines) setAvailableMachines(state.availableMachines);
        if (state.machineMatches) {
          setMachineMatches(new Map(state.machineMatches));
        }
        
        // Show restoration message if we're restoring non-initial state
        if (state.currentStep !== 'upload' && (state.csvData || state.machineMatches?.length > 0)) {
          toast({
            title: 'Import state restored',
            description: 'Your previous import session has been restored.',
          });
        }
      }
    } catch (error) {
      console.warn('Failed to restore cached import state:', error);
    }
  }, [toast]);

  // Save state to cache whenever it changes
  useEffect(() => {
    if (selectedProgram || csvData || currentStep !== 'upload') {
      try {
        const state = {
          selectedProgram,
          currentStep,
          csvData,
          fullCsvData,
          availableMachines,
          machineMatches: Array.from(machineMatches.entries()),
          timestamp: Date.now()
        };
        sessionStorage.setItem('affiliate_import_state', JSON.stringify(state));
      } catch (error) {
        console.warn('Failed to cache import state:', error);
      }
    }
  }, [selectedProgram, csvData, fullCsvData, currentStep, availableMachines, machineMatches]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'text/csv') {
      setUploadedFile(file);
      parseCSV(file);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const parseCSV = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Parse ALL data rows for machine matching
      const allData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      // Preview data (first 5 rows only)
      const previewData = allData.slice(0, 5);

      setCsvData(previewData);
      setFullCsvData(allData);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: 'Error parsing CSV',
        description: 'Failed to read the CSV file. Please check the format.',
        variant: 'destructive',
      });
    }
  };

  const handleImportStart = async () => {
    if (!selectedProgram || !uploadedFile || !csvData) {
      toast({
        title: 'Missing information',
        description: 'Please select a program and upload a CSV file.',
        variant: 'destructive',
      });
      return;
    }

    // Fetch available machines first
    try {
      const machinesResponse = await fetch(`/api/admin/machines?company=xtool`);
      if (machinesResponse.ok) {
        const machinesData = await machinesResponse.json();
        setAvailableMachines(machinesData.machines || []);
      }
    } catch (error) {
      console.error('Failed to fetch machines:', error);
    }

    setCurrentStep('matching');
  };

  const handleMatchingComplete = async (matches: Map<string, string>, selectedCsvRows?: any[]) => {
    console.log('handleMatchingComplete called with:', {
      matchesSize: matches.size,
      selectedCsvRowsCount: selectedCsvRows?.length || 0
    });
    setMachineMatches(matches);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      
      // If we have selected CSV rows, create a new CSV from them
      if (selectedCsvRows && selectedCsvRows.length > 0) {
        // Convert selected rows back to CSV format
        const headers = Object.keys(selectedCsvRows[0]);
        const csvContent = [
          headers.join(','),
          ...selectedCsvRows.map(row => 
            headers.map(header => {
              const value = row[header] || '';
              // Escape values that contain commas or quotes
              if (value.toString().includes(',') || value.toString().includes('"')) {
                return `"${value.toString().replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          )
        ].join('\n');
        
        // Create a new file from the selected rows
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const file = new File([blob], uploadedFile?.name || 'import.csv', { type: 'text/csv' });
        formData.append('file', file);
      } else {
        // Use the original uploaded file
        formData.append('file', uploadedFile!);
      }
      
      formData.append('program_id', selectedProgram);
      
      // Convert matches to JSON and send with request
      const matchesObject = Object.fromEntries(matches);
      formData.append('machine_matches', JSON.stringify(matchesObject));

      const response = await fetch('/api/admin/affiliate/import/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult(result);
      setCurrentStep('complete');

      toast({
        title: result.test_mode ? 'Test import completed' : 'Import completed',
        description: result.test_mode 
          ? `Test run: Processed ${result.total_rows} rows with ${matches.size} machine matches.`
          : `Processed ${result.total_rows} rows with ${matches.size} machine matches.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'Failed to process the CSV file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setCsvData(null);
    setFullCsvData(null);
    setImportResult(null);
    setSelectedProgram('');
    setMachineMatches(new Map());
    
    // Clear session cache
    try {
      sessionStorage.removeItem('affiliate_import_state');
    } catch (error) {
      console.warn('Failed to clear import cache:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Reset Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => {
            sessionStorage.removeItem('affiliate_import_state');
            window.location.reload();
          }}
        >
          Reset Import
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'upload' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
          }`}>
            1
          </div>
          <span className="font-medium">Upload</span>
        </div>
        <div className="h-px bg-gray-200 flex-1" />
        <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-blue-600' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'preview' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
          }`}>
            2
          </div>
          <span className="font-medium">Preview</span>
        </div>
        <div className="h-px bg-gray-200 flex-1" />
        <div className={`flex items-center space-x-2 ${currentStep === 'matching' ? 'text-blue-600' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'matching' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
          }`}>
            3
          </div>
          <span className="font-medium">Process</span>
        </div>
      </div>

      {/* Upload Step */}
      {currentStep === 'upload' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Affiliate Program</CardTitle>
              <CardDescription>
                Choose which affiliate program this CSV file belongs to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an affiliate program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name} ({program.brands.Name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Drag and drop your affiliate sales CSV file here, or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-blue-600">Drop the CSV file here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop your CSV file here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports CSV files up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Step */}
      {currentStep === 'preview' && csvData && uploadedFile && (
        <CSVPreview
          data={csvData}
          filename={uploadedFile.name}
          onNext={handleImportStart}
          onBack={() => setCurrentStep('upload')}
        />
      )}

      {/* Machine Matching Step */}
      {currentStep === 'matching' && fullCsvData && (
        <MachineMatchingInterface
          csvData={fullCsvData}
          availableMachines={availableMachines}
          onMatchingComplete={handleMatchingComplete}
          onBack={() => setCurrentStep('preview')}
        />
      )}

      {/* Complete Step */}
      {currentStep === 'complete' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
            <CardDescription>
              Your CSV file has been processed successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.total_rows}</div>
                <div className="text-sm text-gray-500">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.successful_rows}</div>
                <div className="text-sm text-gray-500">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.failed_rows || 0}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{importResult.auto_matched || 0}</div>
                <div className="text-sm text-gray-500">Auto-matched</div>
              </div>
            </div>
            <div className="flex justify-center space-x-4">
              <Button onClick={resetWizard}>
                Import Another File
              </Button>
              <Button variant="outline">
                View Import Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Imports */}
      {recentImports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Imports</CardTitle>
            <CardDescription>
              Your latest CSV import activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentImports.map((import_) => (
                  <TableRow key={import_.id}>
                    <TableCell className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{import_.filename}</span>
                    </TableCell>
                    <TableCell>
                      {import_.affiliate_programs.name}
                      <div className="text-sm text-gray-500">
                        {import_.affiliate_programs.brands.Name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(import_.status)}
                        <Badge variant={getStatusColor(import_.status) as any}>
                          {import_.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {import_.successful_rows}/{import_.total_rows}
                      {import_.failed_rows > 0 && (
                        <div className="text-sm text-red-500">
                          {import_.failed_rows} failed
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(import_.imported_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}