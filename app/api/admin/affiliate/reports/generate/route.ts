export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { generateAffiliateReport, getQuarterDates } from '@/lib/services/affiliate-reports';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId, quarter, year, title } = body;

    if (!programId || !quarter || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: programId, quarter, year' },
        { status: 400 }
      );
    }

    // Get the date range for the quarter
    const period = getQuarterDates(quarter, year);

    // Generate the report
    const report = await generateAffiliateReport(programId, period, title);

    return NextResponse.json({ 
      success: true, 
      report,
      message: 'Report generated successfully'
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}