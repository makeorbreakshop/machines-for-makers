'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RedirectToUnified() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin/discovery-unified?tab=products')
  }, [router])
  
  return <div>Redirecting to Discovery Pipeline...</div>
}