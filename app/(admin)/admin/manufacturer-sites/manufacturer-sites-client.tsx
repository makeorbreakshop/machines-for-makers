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
import { AlertCircle, Globe, Play, Plus, Settings, Trash2, ChevronDown, FlaskConical, History, Package } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ManufacturerSite {
  id: string
  name: string
  base_url: string
  sitemap_url: string | null
  scraping_config: any
  last_crawled_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
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
    is_active: true
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      const response = await fetch('/api/brands')
      const result = await response.json()
      
      if (response.ok) {
        setBrands(result.data || [])
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
        is_active: site.is_active
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
        is_active: true
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
      const response = await fetch(`/api/admin/manufacturer-sites/${site.id}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          scan_type: 'discovery',
          test_mode: testMode 
        }),
      })

      const result = await response.json()

      if (response.ok) {
        const message = testMode 
          ? `Test crawl started for ${site.base_url} (no Scrapfly credits used)`
          : `Crawl started for ${site.base_url} (Scan ID: ${result.scanLogId})`
        setSuccess(message)
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(result.error || 'Failed to trigger crawl')
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to trigger crawl')
      setTimeout(() => setError(null), 3000)
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
                          Run Discovery (uses Scrapfly credits)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => triggerCrawl(site, true)}>
                          <FlaskConical className="h-4 w-4 mr-2" />
                          Test Mode (no credits used)
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSite ? 'Edit Manufacturer Site' : 'Add Manufacturer Site'}
            </DialogTitle>
            <DialogDescription>
              Configure a manufacturer website for automated product discovery
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ComMarker"
                  required
                />
              </div>

              <div>
                <Label htmlFor="base_url">Base URL *</Label>
                <Input
                  id="base_url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sitemap_url">Sitemap URL</Label>
              <Input
                id="sitemap_url"
                value={formData.sitemap_url}
                onChange={(e) => setFormData({ ...formData, sitemap_url: e.target.value })}
                placeholder="https://example.com/sitemap.xml"
              />
            </div>

            <div>
              <Label htmlFor="scraping_config">Scraping Configuration (JSON)</Label>
              <Textarea
                id="scraping_config"
                value={formData.scraping_config}
                onChange={(e) => setFormData({ ...formData, scraping_config: e.target.value })}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSite ? 'Update Site' : 'Create Site'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}