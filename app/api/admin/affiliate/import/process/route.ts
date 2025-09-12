export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for large imports

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminCookie, validateAdminCookie } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const adminCookie = getAdminCookie(request);
    if (!adminCookie || !validateAdminCookie(adminCookie)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const programId = formData.get('program_id') as string;
    const machineMatchesJson = formData.get('machine_matches') as string;

    if (!file || !programId) {
      return NextResponse.json(
        { message: 'Missing file or program_id' },
        { status: 400 }
      );
    }

    // Parse machine matches if provided
    let machineMatches: Record<string, string> = {};
    if (machineMatchesJson) {
      try {
        machineMatches = JSON.parse(machineMatchesJson);
      } catch (error) {
        console.error('Failed to parse machine matches:', error);
      }
    }

    const supabase = createServiceClient();

    // Verify the program exists
    const { data: program, error: programError } = await supabase
      .from('affiliate_programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { message: 'Invalid affiliate program' },
        { status: 400 }
      );
    }

    // Parse CSV file
    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { message: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      );
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Detect key columns
    const columnMappings = detectColumns(headers);

    // Create import batch record
    const totalRows = lines.length - 1;
    const { data: importBatch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        program_id: programId,
        filename: file.name,
        total_rows: totalRows,
        status: 'processing',
        csv_headers: headers,
        column_mappings: columnMappings,
      })
      .select()
      .single();

    if (batchError || !importBatch) {
      console.error('Failed to create import batch:', batchError);
      return NextResponse.json(
        { message: 'Failed to create import batch' },
        { status: 500 }
      );
    }

    // Process data rows
    let successful = 0;
    let failed = 0;
    let duplicates = 0;
    const salesRecords = [];
    const allOrderNumbers = [];

    // First pass: collect all order numbers
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVRow(lines[i]);
      const rowData: any = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      const orderNumber = extractValue(rowData, columnMappings.orderNumber) || `IMPORT_${i}`;
      allOrderNumbers.push(orderNumber);
    }

    // Batch check for existing orders
    const { data: existingOrders } = await supabase
      .from('affiliate_sales')
      .select('order_number')
      .eq('program_id', programId)
      .in('order_number', allOrderNumbers);
    
    const existingOrderSet = new Set((existingOrders || []).map(o => o.order_number));

    // Track order numbers we're about to insert to catch CSV internal duplicates
    const orderNumbersToInsert = new Set<string>();

    // Second pass: process records
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVRow(lines[i]);
        const rowData: any = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        // Extract key fields using detected mappings
        const productString = extractValue(rowData, columnMappings.product) || null;
        const machineId = productString && machineMatches[productString] ? machineMatches[productString] : null;
        const orderNumber = extractValue(rowData, columnMappings.orderNumber) || `IMPORT_${i}`;
        const orderDate = parseDate(extractValue(rowData, columnMappings.date)) || new Date().toISOString();
        const customerName = extractValue(rowData, columnMappings.customer) || null;
        const totalSales = parseFloat(cleanCurrency(extractValue(rowData, columnMappings.total))) || 0;

        // Check for duplicates in existing database
        if (existingOrderSet.has(orderNumber)) {
          console.log(`Skipping duplicate order: ${orderNumber}`);
          duplicates++;
          continue;
        }

        // Check for duplicates within this CSV file
        if (orderNumbersToInsert.has(orderNumber)) {
          console.log(`Skipping duplicate within CSV: ${orderNumber}`);
          duplicates++;
          continue;
        }
        
        orderNumbersToInsert.add(orderNumber);

        const salesRecord = {
          program_id: programId,
          import_batch_id: importBatch.id,
          machine_id: machineId,
          order_number: orderNumber,
          order_date: orderDate,
          customer_name: customerName,
          customer_address: extractValue(rowData, columnMappings.address) || null,
          total_sales: totalSales,
          quantity: parseInt(extractValue(rowData, columnMappings.quantity)) || 1,
          commission_amount: parseFloat(cleanCurrency(extractValue(rowData, columnMappings.commission))) || 0,
          status: mapStatus(extractValue(rowData, columnMappings.status)) || 'pending',
          raw_product_string: productString,
          product_match_confidence: machineId ? 1.0 : null,
          raw_csv_data: rowData,
        };

        salesRecords.push(salesRecord);
        successful++;
      } catch (error) {
        console.error(`Error processing row ${i}:`, error);
        failed++;
      }
    }

    // Insert sales records in smaller batches to avoid timeouts
    if (salesRecords.length > 0) {
      const BATCH_SIZE = 100; // Insert 100 records at a time
      let totalInserted = 0;
      let insertErrors = 0;
      
      for (let i = 0; i < salesRecords.length; i += BATCH_SIZE) {
        const batch = salesRecords.slice(i, i + BATCH_SIZE);
        const { error: insertError, data } = await supabase
          .from('affiliate_sales')
          .insert(batch)
          .select();

        if (insertError) {
          // If it's a duplicate key error, try inserting one by one to skip duplicates
          if (insertError.code === '23505') {
            console.log(`Batch has duplicates, inserting one by one...`);
            for (const record of batch) {
              const { error: singleError } = await supabase
                .from('affiliate_sales')
                .insert(record);
              
              if (singleError) {
                if (singleError.code === '23505') {
                  console.log(`Skipping duplicate order: ${record.order_number}`);
                  duplicates++;
                } else {
                  console.error(`Failed to insert order ${record.order_number}:`, singleError);
                  insertErrors++;
                }
              } else {
                totalInserted++;
              }
            }
          } else {
            console.error(`Failed to insert batch starting at ${i}:`, insertError);
            // Update batch status to failed
            await supabase
              .from('import_batches')
              .update({
                status: 'failed',
                error_message: `Failed to insert sales records at row ${i}: ${insertError.message}`,
                processed_rows: totalInserted,
              })
              .eq('id', importBatch.id);

            return NextResponse.json(
              { message: `Failed to save sales records: ${insertError.message}` },
              { status: 500 }
            );
          }
        } else {
          totalInserted += (data?.length || batch.length);
        }
        
        console.log(`Progress: ${totalInserted} inserted, ${duplicates} duplicates skipped`);
      }
      
      successful = totalInserted;
    }

    // Update import batch with final results
    await supabase
      .from('import_batches')
      .update({
        status: 'completed',
        processed_rows: successful,
        successful_rows: successful,
        failed_rows: failed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importBatch.id);

    return NextResponse.json({
      message: 'Import completed successfully',
      batch_id: importBatch.id,
      total_rows: totalRows,
      successful_rows: successful,
      failed_rows: failed,
      duplicate_rows: duplicates,
      auto_matched: 0, // TODO: Implement product matching
    });

  } catch (error) {
    console.error('Error processing import:', error);
    return NextResponse.json(
      { message: 'Internal server error during import processing' },
      { status: 500 }
    );
  }
}

// Helper functions
function detectColumns(headers: string[]) {
  const mappings: any = {};
  
  headers.forEach(header => {
    const lower = header.toLowerCase();
    
    if (/order.?number|order.?id|#/.test(lower)) {
      mappings.orderNumber = header;
    } else if (/customer|buyer|name/.test(lower) && !mappings.customer) {
      mappings.customer = header;
    } else if (/address/.test(lower)) {
      mappings.address = header;
    } else if (/total.?sales|amount|revenue|sub.?total/.test(lower)) {
      mappings.total = header;
    } else if (/commission|fee|earning/.test(lower)) {
      mappings.commission = header;
    } else if (/quantity|qty/.test(lower)) {
      mappings.quantity = header;
    } else if (/status|state/.test(lower)) {
      mappings.status = header;
    } else if (/date|time|created/.test(lower)) {
      mappings.date = header;
    } else if (/product|item|description/.test(lower)) {
      mappings.product = header;
    }
  });
  
  return mappings;
}

function extractValue(rowData: any, columnName?: string): string {
  if (!columnName || !rowData[columnName]) return '';
  return rowData[columnName].toString().trim();
}

function parseCSVRow(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function cleanCurrency(value: string): string {
  if (!value) return '0';
  return value.replace(/[\$,\s]/g, '').replace(/[()]/g, '-');
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

function mapStatus(status: string): string {
  if (!status) return 'pending';
  
  const lower = status.toLowerCase();
  if (lower.includes('paid') || lower.includes('complete')) return 'paid';
  if (lower.includes('approved') || lower.includes('confirm')) return 'approved';
  if (lower.includes('pending') || lower.includes('review')) return 'pending';
  if (lower.includes('reject') || lower.includes('cancel')) return 'rejected';
  
  return 'pending';
}