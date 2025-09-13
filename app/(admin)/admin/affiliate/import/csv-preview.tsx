"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, FileText, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CSVPreviewProps {
  data: any[];
  filename: string;
  onNext: () => void;
  onBack: () => void;
}

export function CSVPreview({ data, filename, onNext, onBack }: CSVPreviewProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No data found</h3>
              <p className="text-sm text-muted-foreground">
                The CSV file appears to be empty or couldn't be parsed.
              </p>
            </div>
            <Button onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const headers = Object.keys(data[0]);
  const hasValidHeaders = headers.length > 0;

  // Detect important columns
  const detectedColumns = {
    orderNumber: headers.find(h => 
      /order.?number|order.?id|#/i.test(h)
    ),
    customer: headers.find(h => 
      /customer|buyer|name/i.test(h)
    ),
    total: headers.find(h => 
      /total|amount|sales|revenue/i.test(h)
    ),
    commission: headers.find(h => 
      /commission|fee/i.test(h)
    ),
    date: headers.find(h => 
      /date|time|created/i.test(h)
    ),
    product: headers.find(h => 
      /product|item|description/i.test(h)
    ),
  };

  const detectedCount = Object.values(detectedColumns).filter(Boolean).length;
  const isGoodFormat = detectedCount >= 4; // Need at least 4 key columns

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{filename}</span>
          </CardTitle>
          <CardDescription>
            Preview of your CSV file data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Column Detection Results */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Total Columns</div>
              <Badge variant="outline">{headers.length}</Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Detected Fields</div>
              <Badge variant={isGoodFormat ? "default" : "secondary"}>
                {detectedCount}/6 key fields
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Preview Rows</div>
              <Badge variant="outline">{data.length}</Badge>
            </div>
          </div>

          {/* Column Mapping Status */}
          {!isGoodFormat && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some key columns may not have been detected automatically. The import will still work,
                but you may need to manually map columns or verify the data after import.
              </AlertDescription>
            </Alert>
          )}

          {/* Detected Columns */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Detected Columns:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="w-20 text-gray-500">Order:</span>
                <Badge variant={detectedColumns.orderNumber ? "default" : "secondary"}>
                  {detectedColumns.orderNumber || 'Not detected'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-20 text-gray-500">Customer:</span>
                <Badge variant={detectedColumns.customer ? "default" : "secondary"}>
                  {detectedColumns.customer || 'Not detected'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-20 text-gray-500">Total:</span>
                <Badge variant={detectedColumns.total ? "default" : "secondary"}>
                  {detectedColumns.total || 'Not detected'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-20 text-gray-500">Commission:</span>
                <Badge variant={detectedColumns.commission ? "default" : "secondary"}>
                  {detectedColumns.commission || 'Not detected'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-20 text-gray-500">Date:</span>
                <Badge variant={detectedColumns.date ? "default" : "secondary"}>
                  {detectedColumns.date || 'Not detected'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-20 text-gray-500">Product:</span>
                <Badge variant={detectedColumns.product ? "default" : "secondary"}>
                  {detectedColumns.product || 'Not detected'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Data Preview Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="text-xs">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index}>
                    {headers.map((header) => (
                      <TableCell key={header} className="text-xs max-w-32 truncate">
                        {row[header] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data.length > 0 && (
            <div className="text-sm text-gray-500 text-center">
              Showing all {data.length} rows from the CSV file.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload
        </Button>
        <Button onClick={onNext}>
          Start Import
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}