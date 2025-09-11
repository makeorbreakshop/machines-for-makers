import { ManufacturerSitesClient } from './manufacturer-sites-client'

export const runtime = 'nodejs'

export default function ManufacturerSitesPage() {
  // Ensure user is authenticated as admin

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manufacturer Sites</h1>
        <p className="text-muted-foreground mt-2">
          Manage manufacturer websites for automated product discovery
        </p>
      </div>
      
      <ManufacturerSitesClient />
    </div>
  )
}