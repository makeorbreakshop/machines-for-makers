'use client'

import { useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye,
  ExternalLink,
  Download
} from "lucide-react"
import { DiscoveredProduct } from "@/app/(admin)/admin/discovery/page"
import { DiscoveryDetailedModal } from "./discovery-detailed-modal"

interface DiscoveryCompactGridProps {
  data: DiscoveredProduct[]
  defaultSiteFilter?: string
}

export function DiscoveryCompactGrid({ data, defaultSiteFilter }: DiscoveryCompactGridProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedProduct, setSelectedProduct] = useState<DiscoveredProduct | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedItems(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === data.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(data.map(item => item.id)))
    }
  }

  const handleBulkApprove = async () => {
    try {
      const response = await fetch('/api/admin/discovery/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: Array.from(selectedItems) 
        })
      })
      
      if (response.ok) {
        window.location.reload()
      } else {
        console.error('Failed to approve products')
      }
    } catch (error) {
      console.error('Error approving products:', error)
    }
  }

  const handleBulkReject = async () => {
    try {
      const response = await fetch('/api/admin/discovery/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: Array.from(selectedItems),
          reason: 'Bulk rejected'
        })
      })
      
      if (response.ok) {
        window.location.reload()
      } else {
        console.error('Failed to reject products')
      }
    } catch (error) {
      console.error('Error rejecting products:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-xs font-medium px-1 py-0.5 rounded">Pending</span>
      case 'approved':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-1 py-0.5 rounded">Approved</span>
      case 'rejected':
        return <span className="bg-red-100 text-red-800 text-xs font-medium px-1 py-0.5 rounded">Rejected</span>
      case 'duplicate':
        return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-1 py-0.5 rounded">Duplicate</span>
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-1 py-0.5 rounded">{status}</span>
    }
  }

  const getProductName = (product: DiscoveredProduct) => {
    return product.normalized_data?.name ||
           product.raw_data?.name ||
           product.raw_data?.title ||
           product.raw_data?.machine_name ||
           'Unnamed Product'
  }

  const getProductPrice = (product: DiscoveredProduct) => {
    const price = product.normalized_data?.price || product.raw_data?.price
    if (typeof price === 'number') {
      return `$${price.toLocaleString()}`
    }
    if (typeof price === 'string') {
      const numPrice = parseFloat(price.replace(/[^0-9.-]/g, ''))
      if (!isNaN(numPrice)) {
        return `$${numPrice.toLocaleString()}`
      }
      return price
    }
    return 'Price N/A'
  }

  const getBrand = (product: DiscoveredProduct) => {
    return product.normalized_data?.brand || 
           product.raw_data?.brand || 
           product.raw_data?.manufacturer || 
           'Unknown Brand'
  }

  const handleUpdateStatus = async (machineId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/admin/discovered-machines/${machineId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      window.location.reload()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleImportMachine = async (machineId: string) => {
    try {
      const response = await fetch(`/api/admin/discovered-machines/${machineId}/import`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import machine')
      }

      const result = await response.json()
      alert(`Machine "${result.machine['Machine Name']}" imported successfully!`)
      window.location.reload()
    } catch (error) {
      console.error('Failed to import machine:', error)
      alert(`Error: ${error.message}`)
    }
  }

  const openDetailModal = (product: DiscoveredProduct) => {
    setSelectedProduct(product)
    setIsDetailModalOpen(true)
  }

  return (
    <div className="bg-white">
      {/* Bulk Actions Bar - Only when items selected */}
      {selectedItems.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b mb-4">
          <span className="text-sm font-medium">{selectedItems.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleBulkApprove} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs">
              Approve
            </Button>
            <Button size="sm" onClick={handleBulkReject} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs">
              Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set())} className="px-3 py-1 text-xs">
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-hidden border border-gray-200 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="relative px-6 py-3 text-left">
                <Checkbox
                  checked={selectedItems.size === data.length && data.length > 0}
                  onCheckedChange={toggleSelectAll}
                  disabled={data.length === 0}
                  className="h-4 w-4"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Machine
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Power
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((product) => {
              const productImage = product.normalized_data?.images?.[0] || 
                                  product.raw_data?.images?.[0] || 
                                  product.raw_data?.image || 
                                  product.raw_data?.image_url;
              
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Checkbox
                      checked={selectedItems.has(product.id)}
                      onCheckedChange={() => toggleSelection(product.id)}
                      disabled={product.status === 'imported'}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={getProductName(product)}
                          className="h-8 w-8 rounded-md object-cover mr-3"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="h-8 w-8 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                          <span className="text-xs text-gray-400">IMG</span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{getProductName(product)}</div>
                        <div className="text-sm text-gray-500">{getBrand(product)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.normalized_data?.laser_power_a || product.raw_data?.power || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getProductPrice(product)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(product.created_at || '').toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(product.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetailModal(product)}
                        className="px-2 py-1 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <a
                        href={product.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Source
                      </a>
                      {product.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(product.id, 'approved')}
                            className="px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:border-green-300"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(product.id, 'rejected')}
                            className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {product.status === 'approved' && !product.imported_machine_id && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleImportMachine(product.id)}
                          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Import
                        </Button>
                      )}
                      {product.status === 'imported' && (
                        <span className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded">
                          Imported
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No products found</p>
        </div>
      )}

      {/* Modal */}
      <DiscoveryDetailedModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedProduct(null)
        }}
      />
    </div>
  )
}