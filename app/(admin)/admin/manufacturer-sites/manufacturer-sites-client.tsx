"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Globe, Play, Plus, Settings, Trash2, ChevronDown, FlaskConical, History, Package, Wand2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ManufacturerSite {
  id: string
  name: string
  base_url: string
  sitemap_url: string | null
  scraping_config: any
  last_crawled_at: string | null
  is_active: boolean
  brand_id: string | null
  created_at: string
  updated_at: string
  brands?: {
    Name: string
    Slug: string
  }
}

interface Brand {
  id: string
  Name: string
  Slug: string
}

export function ManufacturerSitesClient() {
  const [sites, setSites] = useState<ManufacturerSite[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<ManufacturerSite | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    base_url: '',
    sitemap_url: '',
    scraping_config: '{}',
    is_active: true,
    brand_id: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [autoDiscovering, setAutoDiscovering] = useState(false)
  const [discoveryReport, setDiscoveryReport] = useState<any>(null)

  // Fetch sites and brands on component mount
  useEffect(() => {
    fetchSites()
    fetchBrands()
  }, [])

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/admin/manufacturer-sites')
      const result = await response.json()
      
      if (response.ok) {
        setSites(result.data || [])
      } else {
        setError(result.error || 'Failed to fetch sites')
      }
    } catch (err) {
      setError('Failed to fetch sites')
    } finally {
      setLoading(false)
    }
  }

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/admin/brands')
      const result = await response.json()
      
      if (response.ok) {
        setBrands(result || [])
      } else {
        console.error('Failed to fetch brands:', result.error)
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err)
    }
  }

  const openDialog = (site?: ManufacturerSite) => {
    if (site) {
      setEditingSite(site)
      setFormData({
        name: site.name,
        base_url: site.base_url,
        sitemap_url: site.sitemap_url || '',
        scraping_config: JSON.stringify(site.scraping_config, null, 2),
        is_active: site.is_active,
        brand_id: site.brand_id || ''
      })
    } else {
      setEditingSite(null)
      setFormData({
        name: '',
        base_url: '',
        sitemap_url: '',
        scraping_config: JSON.stringify({
          crawl_delay: 3000,
          user_agent: "MachinesForMakers/1.0",
          respect_robots: true,
          product_url_patterns: ["/products/*"],
          exclude_patterns: ["/blog/*", "/support/*"],
          use_sitemap: true
        }, null, 2),
        is_active: true,
        brand_id: ''
      })
    }
    setDialogOpen(true)
    setError(null)
    setSuccess(null)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingSite(null)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Validate JSON config
      let config = {}
      try {
        config = JSON.parse(formData.scraping_config)
      } catch {
        setError('Invalid JSON in scraping configuration')
        return
      }

      const payload = {
        ...formData,
        scraping_config: config
      }

      const url = editingSite
        ? `/api/admin/manufacturer-sites/${editingSite.id}`
        : '/api/admin/manufacturer-sites'
      
      const method = editingSite ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(editingSite ? 'Site updated successfully' : 'Site created successfully')
        await fetchSites()
        setTimeout(closeDialog, 1500)
      } else {
        setError(result.error || 'Failed to save site')
      }
    } catch (err) {
      setError('Failed to save site')
    }
  }

  const handleDelete = async (site: ManufacturerSite) => {
    if (!confirm(`Are you sure you want to delete ${site.base_url}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/manufacturer-sites/${site.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess('Site deleted successfully')
        await fetchSites()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to delete site')
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to delete site')
      setTimeout(() => setError(null), 3000)
    }
  }

  const triggerCrawl = async (site: ManufacturerSite, testMode: boolean = false) => {
    try {
      // Check if site has a brand_id
      if (!site.brand_id) {
        setError('This manufacturer site is not linked to a brand. Please edit the site and select a brand first.')
        setTimeout(() => setError(null), 5000)
        return
      }
      
      // Use smart discovery endpoint with machine filtering
      const response = await fetch('http://localhost:8000/api/v1/smart/smart-discover-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manufacturer_id: site.brand_id, // Use brand_id for consistency
          base_url: site.base_url,
          manufacturer_name: site.name,
          max_pages: 5,
          apply_smart_filtering: true,
          apply_machine_filtering: true
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Save the discovered URLs to database
        const saveResponse = await fetch('/api/admin/save-discovered-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manufacturer_id: site.brand_id, // Use brand_id, not site.id
            urls: [],
            classified_urls: result.classified_urls,
            classification_summary: result.classification_summary
          })
        })
        
        if (saveResponse.ok) {
          const saveResult = await saveResponse.json()
          setSuccess(`Discovery complete: Found ${result.total_urls_found} URLs, filtered ${result.classification_summary.urls_filtered_as_non_machines || 0} non-machines`)
          
          // Redirect to discovered URLs page
          setTimeout(() => {
            window.location.href = `/admin/discovered-urls?manufacturer_id=${site.brand_id}`
          }, 1500)
        } else {
          throw new Error('Failed to save discovered URLs')
        }
      } else {
        const errorMsg = result.detail || result.error || 'Failed to start discovery'
        setError(errorMsg)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      console.error('Discovery error:', err)
      setError('Failed to start discovery. Make sure the Python service is running.')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleAutoDiscovery = async () => {
    if (!formData.base_url || !formData.name) {
      setError('Please enter site name and base URL first')
      return
    }

    setAutoDiscovering(true)
    setError(null)
    setDiscoveryReport(null)

    try {
      const response = await fetch('http://localhost:8000/api/v1/discover-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_url: formData.base_url,
          site_name: formData.name
        })
      })

      const result = await response.json()

      if (result.success) {
        // Update form with discovered configuration
        setFormData({
          ...formData,
          scraping_config: result.configuration,
          sitemap_url: result.report.sitemap_found ? 
            `${formData.base_url}/sitemap.xml` : formData.sitemap_url
        })
        setDiscoveryReport(result.report)
        setSuccess(`Auto-discovery complete! Found ${result.report.category_count} category URLs`)
      } else {
        setError(result.error || 'Auto-discovery failed')
      }
    } catch (err) {
      setError('Failed to connect to discovery service')
    } finally {
      setAutoDiscovering(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {sites.length} manufacturer sites configured
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Site
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Crawled</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell className="font-medium">
                  {site.name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>{site.base_url}</span>
                    {site.sitemap_url && (
                      <Badge variant="secondary" className="text-xs">
                        Sitemap
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {site.brands?.Name ? (
                    <Badge variant="outline" className="text-xs">
                      {site.brands.Name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">Not linked</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={site.is_active ? 'default' : 'secondary'}>
                    {site.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(site.last_crawled_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!site.is_active}
                          className="flex items-center gap-1"
                        >
                          <Play className="h-4 w-4" />
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => triggerCrawl(site, false)}>
                          <Play className="h-4 w-4 mr-2" />
                          Run Discovery with ML Filtering
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/admin/discovery?site=${site.name}`}
                      title="Review discovered machines"
                    >
                      <Package className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/admin/manufacturer-sites/${site.id}/scans`}
                      title="View scan history"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(site)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(site)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSite ? 'Edit Manufacturer Site' : 'Add Manufacturer Site'}
            </DialogTitle>
            <DialogDescription>
              Configure a manufacturer website for automated product discovery
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Site Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="OmTech"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="base_url">Base URL *</Label>
                  <Input
                    id="base_url"
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="https://omtechlaser.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sitemap_url">Sitemap URL (Optional)</Label>
                <Input
                  id="sitemap_url"
                  value={formData.sitemap_url}
                  onChange={(e) => setFormData({ ...formData, sitemap_url: e.target.value })}
                  placeholder="https://omtechlaser.com/sitemap.xml"
                />
              </div>

              <div>
                <Label htmlFor="brand_id">Link to Brand (Optional)</Label>
                <Select
                  value={formData.brand_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, brand_id: value || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Link this site to a brand so discovered machines are automatically assigned. Can be changed per machine later.
                </p>
              </div>
            </div>

            {/* Auto-Discovery Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Scraping Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate configuration automatically or edit manually
                  </p>
                </div>
                
                <Button
                  type="button"
                  onClick={handleAutoDiscovery}
                  disabled={autoDiscovering || !formData.base_url || !formData.name}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  {autoDiscovering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Auto-Discover Config
                    </>
                  )}
                </Button>
              </div>
              
              {discoveryReport && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">Discovery Complete!</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>✅ Sitemap found: {discoveryReport.sitemap_found ? 'Yes' : 'No'}</div>
                        <div>📊 Category URLs: {discoveryReport.category_count}</div>
                        <div>⏱️ Crawl delay: {discoveryReport.suggested_delay}ms</div>
                        <div>🔍 Analysis complete</div>
                      </div>
                      {discoveryReport.category_urls?.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium">
                            View sample URLs ({discoveryReport.category_urls.length} found)
                          </summary>
                          <ul className="mt-2 ml-4 space-y-1">
                            {discoveryReport.category_urls.slice(0, 5).map((url: string, idx: number) => (
                              <li key={idx} className="text-xs text-muted-foreground truncate">
                                • {url}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div>
                <Label htmlFor="scraping_config">Configuration JSON</Label>
                <Textarea
                  id="scraping_config"
                  value={formData.scraping_config}
                  onChange={(e) => setFormData({ ...formData, scraping_config: e.target.value })}
                  rows={10}
                  className="font-mono text-sm mt-2"
                  placeholder='{"crawl_delay": 3000, "user_agent": "MachinesForMakers/1.0", "use_sitemap": true}'
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-medium">Settings</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Site is active for discovery</Label>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={autoDiscovering}>
                {editingSite ? 'Update Site' : 'Create Site'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}