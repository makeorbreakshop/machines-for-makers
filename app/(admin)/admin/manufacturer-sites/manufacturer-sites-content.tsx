'use client'

import { ManufacturerSitesClient } from './manufacturer-sites-client'

interface ManufacturerSitesContentProps {
  onDiscoverUrls?: (manufacturerId: string) => void
}

export function ManufacturerSitesContent({ onDiscoverUrls }: ManufacturerSitesContentProps) {
  // The existing component handles its own URL discovery modal
  // We just need to wrap it for the unified view
  return <ManufacturerSitesClient />
}