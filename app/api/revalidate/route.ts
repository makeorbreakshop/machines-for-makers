import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET() {
  // Revalidate the admin routes
  revalidatePath('/admin');
  revalidatePath('/admin/login');
  
  // Revalidate the API routes that handle authentication
  revalidatePath('/api/admin/login');
  
  return NextResponse.json({ 
    revalidated: true, 
    now: Date.now(),
    message: 'Admin cache successfully revalidated' 
  });
} 