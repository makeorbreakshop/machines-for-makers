export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateReports } from '@/lib/services/affiliate-reports';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');
    
    const reports = await getAffiliateReports(programId || undefined);
    
    return NextResponse.json({ 
      reports,
      count: reports.length 
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}