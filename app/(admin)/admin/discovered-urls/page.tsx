export const runtime = 'nodejs'

import { Suspense } from 'react'
import { DiscoveredURLsContent } from './discovered-urls-content'

export default function DiscoveredURLsPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<div>Loading...</div>}>
        <DiscoveredURLsContent />
      </Suspense>
    </div>
  )
}