import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    const { count, error } = await supabase
      .from('discovered_machines')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    
    if (error) {
      console.error('Error fetching discovery count:', error)
      return NextResponse.json({ count: 0 })
    }
    
    return NextResponse.json({ count: count || 0 })
    
  } catch (error) {
    console.error('Error in discovery count:', error)
    return NextResponse.json({ count: 0 })
  }
}