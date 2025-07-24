export const runtime = 'nodejs'

import { Suspense } from 'react'
import { UnifiedDiscoveryContent } from './unified-discovery-content'

export default function UnifiedDiscoveryPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<div>Loading...</div>}>
        <UnifiedDiscoveryContent />
      </Suspense>
    </div>
  )
}