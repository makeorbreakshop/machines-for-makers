import { NextResponse } from 'next/server';
import { getLogoUrl } from '@/lib/services/logo-service';

export async function GET() {
  try {
    const logoUrl = await getLogoUrl();
    return NextResponse.json({ url: logoUrl });
  } catch (error) {
    console.error('Error in logo API:', error);
    return NextResponse.json({ url: null }, { status: 500 });
  }
}