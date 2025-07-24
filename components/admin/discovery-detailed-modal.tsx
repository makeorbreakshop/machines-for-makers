'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Save,
  X,
  Eye,
  Image,
  Copy
} from "lucide-react"
import { DiscoveredProduct } from "@/app/(admin)/admin/discovery/page"

interface DiscoveryDetailedModalProps {
  product: DiscoveredProduct | null
  isOpen: boolean
  onClose: () => void
}

interface EditableFields {
  name: string
  brand: string
  price: string
  description: string
  machine_category: string
  laser_category: string
  
  // Technical specifications
  laser_type_a: string
  laser_power_a: string
  laser_type_b: string
  laser_power_b: string
  work_area: string
  speed: string
  machine_size: string
  software: string
  
  // Boolean features
  focus: string
  enclosure: string
  wifi: string
  camera: string
  air_assist: string
  rotary: string
  passthrough: string
  
  // Additional specs
  material: string
  connectivity: string
}

// Field validation and formatting functions
const validateAndFormat = {
  price: (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''))
    if (isNaN(num)) throw new Error('Price must be a valid number')
    return num
  },
  laser_power_a: (value: string) => {
    const match = value.match(/^(\d+(?:\.\d+)?)\s*([kKmM]?)W?$/i)
    if (!match) throw new Error('Format: "40W" or "5.5W"')
    const num = parseFloat(match[1])
    const unit = match[2].toLowerCase()
    if (unit === 'k') return `${num * 1000}W`
    if (unit === 'm') return `${num / 1000}W`
    return `${num}W`
  },
  work_area: (value: string) => {
    const match = value.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(mm|cm|in)?$/i)
    if (!match) throw new Error('Format: "400 x 400 mm"')
    let w = parseFloat(match[1])
    let h = parseFloat(match[2])
    const unit = match[3]?.toLowerCase() || 'mm'
    
    if (unit === 'cm') { w *= 10; h *= 10 }
    if (unit === 'in') { w *= 25.4; h *= 25.4 }
    
    return `${Math.round(w)} x ${Math.round(h)} mm`
  },
  speed: (value: string) => {
    const match = value.match(/^(\d+(?:\.\d+)?)\s*(mm\/min|mm\/s|m\/min)?$/i)
    if (!match) throw new Error('Format: "12000 mm/min"')
    let speed = parseFloat(match[1])
    const unit = match[2]?.toLowerCase() || 'mm/min'
    
    if (unit === 'mm/s') speed *= 60
    if (unit === 'm/min') speed *= 1000
    
    return `${Math.round(speed)} mm/min`
  }
}

const LASER_TYPES = ['Diode', 'CO2', 'Fiber', 'Galvo', 'UV', 'Other']
const MACHINE_CATEGORIES = ['laser', '3d-printer', 'cnc']
const LASER_CATEGORIES = [
  'desktop-diode-laser',
  'desktop-co2-laser', 
  'desktop-fiber-laser',
  'fiber-laser',
  'high-end-co2-laser',
  'industrial-co2-laser',
  'industrial-fiber-laser'
]

export function DiscoveryDetailedModal({ product, isOpen, onClose }: DiscoveryDetailedModalProps) {
  const [editableFields, setEditableFields] = useState<EditableFields>({
    name: '',
    brand: '',
    price: '',
    description: '',
    machine_category: '',
    laser_category: '',
    
    // Technical specifications
    laser_type_a: '',
    laser_power_a: '',
    laser_type_b: '',
    laser_power_b: '',
    work_area: '',
    speed: '',
    machine_size: '',
    software: '',
    
    // Boolean features
    focus: '',
    enclosure: '',
    wifi: '',
    camera: '',
    air_assist: '',
    rotary: '', 
    passthrough: '',
    
    // Additional specs
    material: '',
    connectivity: ''
  })
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Initialize fields when product changes
  useEffect(() => {
    if (product && isOpen) {
      setEditableFields({
        name: product.normalized_data?.name || product.raw_data?.name || product.raw_data?.title || '',
        brand: product.normalized_data?.brand || product.raw_data?.brand || product.raw_data?.manufacturer || '',
        price: product.normalized_data?.price?.toString() || product.raw_data?.price?.toString() || '',
        description: product.normalized_data?.description || product.raw_data?.description || '',
        machine_category: product.normalized_data?.machine_category || 'laser',
        laser_category: product.normalized_data?.laser_category || 'desktop-diode-laser',
        
        // Technical specifications
        laser_type_a: product.normalized_data?.laser_type_a || '',
        laser_power_a: product.normalized_data?.laser_power_a || '',
        laser_type_b: product.normalized_data?.laser_type_b || '',
        laser_power_b: product.normalized_data?.laser_power_b || '',
        work_area: product.normalized_data?.work_area || '',
        speed: product.normalized_data?.speed || '',
        machine_size: product.normalized_data?.machine_size || '',
        software: product.normalized_data?.software || '',
        
        // Boolean features
        focus: product.normalized_data?.focus || '',
        enclosure: product.normalized_data?.enclosure || '',
        wifi: product.normalized_data?.wifi || '',
        camera: product.normalized_data?.camera || '',
        air_assist: product.normalized_data?.air_assist || '',
        rotary: product.normalized_data?.rotary || '',
        passthrough: product.normalized_data?.passthrough || '',
        
        // Additional specs
        material: product.normalized_data?.material || '',
        connectivity: product.normalized_data?.connectivity || ''
      })
    }
  }, [product, isOpen])

  const handleFieldChange = (field: keyof EditableFields, value: string) => {
    setEditableFields(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateField = (field: keyof EditableFields, value: string) => {
    try {
      if (field in validateAndFormat) {
        validateAndFormat[field as keyof typeof validateAndFormat](value)
      }
      return null
    } catch (error) {
      return (error as Error).message
    }
  }

  const handleSave = async () => {
    if (!product) return
    
    setIsSaving(true)
    const errors: Record<string, string> = {}
    
    // Validate all fields
    Object.entries(editableFields).forEach(([field, value]) => {
      if (value) {
        const error = validateField(field as keyof EditableFields, value)
        if (error) errors[field] = error
      }
    })
    
    setValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      setIsSaving(false)
      return
    }
    
    try {
      // Apply formatting to fields
      const formattedFields = { ...editableFields }
      Object.entries(formattedFields).forEach(([field, value]) => {
        if (value && field in validateAndFormat) {
          try {
            formattedFields[field as keyof EditableFields] = validateAndFormat[field as keyof typeof validateAndFormat](value).toString()
          } catch (e) {
            // Already validated above
          }
        }
      })
      
      const response = await fetch(`/api/admin/discovered-machines/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ normalized_data: formattedFields })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save changes')
      }
      
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const copyRawValue = (rawValue: string, field: keyof EditableFields) => {
    handleFieldChange(field, rawValue)
    navigator.clipboard.writeText(rawValue)
  }

  if (!product) return null

  // Get the raw scraped value that OpenAI found and matched to this field
  const getRawMatchedValue = (field: string) => {
    // The raw data is nested under raw_data.raw_data from the discovery service
    const rawData = product.raw_data?.raw_data || product.raw_data || {}
    
    // Helper to search through specifications and features
    const searchInObject = (obj: any, searchKeys: string[]): any => {
      if (!obj || typeof obj !== 'object') return null
      
      // Direct key matches
      for (const key of searchKeys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          return obj[key]
        }
      }
      
      // Case-insensitive key matches
      const lowerKeys = Object.keys(obj).map(k => k.toLowerCase())
      for (const searchKey of searchKeys) {
        const lowerSearchKey = searchKey.toLowerCase()
        const matchingKey = Object.keys(obj).find(k => k.toLowerCase().includes(lowerSearchKey))
        if (matchingKey && obj[matchingKey] !== undefined && obj[matchingKey] !== null && obj[matchingKey] !== '') {
          return obj[matchingKey]
        }
      }
      
      return null
    }
    
    // Helper to search in specifications array
    const searchInSpecs = (searchTerms: string[]): any => {
      if (rawData.specifications) {
        const specs = Array.isArray(rawData.specifications) 
          ? rawData.specifications 
          : Object.entries(rawData.specifications || {}).map(([name, value]) => ({name, value}))
        
        for (const spec of specs) {
          const name = (spec.name || '').toLowerCase()
          if (searchTerms.some(term => name.includes(term.toLowerCase()))) {
            return spec.value
          }
        }
      }
      return null
    }
    
    switch (field) {
      case 'name':
        return searchInObject(rawData, ['name', 'title', 'machine_name', 'product_name'])
      case 'brand':
        return searchInObject(rawData, ['brand', 'manufacturer', 'vendor', 'company'])
      case 'price':
        return rawData.price || rawData.offers?.[0]?.price || searchInObject(rawData, ['cost', 'price_usd', 'msrp'])
      case 'description':
        return searchInObject(rawData, ['description', 'description_markdown', 'summary', 'overview'])
      case 'machine_category':
        return searchInObject(rawData, ['category', 'type', 'machine_type'])
      case 'laser_category':
        return searchInObject(rawData, ['subcategory', 'laser_type', 'category'])
      case 'laser_type_a':
        return searchInSpecs(['laser type', 'laser', 'type']) || searchInObject(rawData, ['laser_type', 'type'])
      case 'laser_power_a':
        return searchInSpecs(['power', 'watt', 'laser power']) || searchInObject(rawData, ['power', 'laser_power', 'wattage'])
      case 'laser_type_b':
        return searchInSpecs(['secondary laser', 'laser b', 'second laser'])
      case 'laser_power_b':
        return searchInSpecs(['secondary power', 'power b', 'second power'])
      case 'work_area':
        return searchInSpecs(['work area', 'working area', 'bed size', 'cutting area']) || searchInObject(rawData, ['work_area', 'bed_size'])
      case 'speed':
        return searchInSpecs(['speed', 'max speed', 'cutting speed']) || searchInObject(rawData, ['speed', 'max_speed'])
      case 'machine_size':
        return searchInSpecs(['machine size', 'dimensions', 'product dimensions']) || searchInObject(rawData, ['dimensions', 'size'])
      case 'software':
        return searchInSpecs(['software', 'supported software', 'compatible software']) || searchInObject(rawData, ['software'])
      case 'focus':
        return searchInSpecs(['focus', 'autofocus', 'focus mode']) || searchInObject(rawData, ['focus', 'autofocus'])
      case 'enclosure':
        return searchInSpecs(['enclosure', 'enclosed', 'housing']) || searchInObject(rawData, ['enclosure', 'enclosed'])
      case 'wifi':
        return searchInSpecs(['wifi', 'wireless', 'wi-fi', 'connection']) || searchInObject(rawData, ['wifi', 'wireless'])
      case 'camera':
        return searchInSpecs(['camera', 'built-in camera', 'vision']) || searchInObject(rawData, ['camera', 'vision'])
      case 'air_assist':
        return searchInSpecs(['air assist', 'air', 'assist']) || searchInObject(rawData, ['air_assist', 'air'])
      case 'rotary':
        return searchInSpecs(['rotary', 'rotary attachment', 'cylinder']) || searchInObject(rawData, ['rotary'])
      case 'passthrough':
        return searchInSpecs(['passthrough', 'pass through', 'pass-through']) || searchInObject(rawData, ['passthrough'])
      case 'material':
        return searchInSpecs(['material', 'frame material', 'construction']) || searchInObject(rawData, ['material', 'frame'])
      case 'connectivity':
        return searchInSpecs(['connectivity', 'connection', 'interface']) || searchInObject(rawData, ['connectivity', 'connection'])
      default:
        return searchInObject(rawData, [field, field.replace('_', ' '), field.replace('_', '-')])
    }
  }

  // Get the OpenAI formatted/converted value
  const getOpenAIFormattedValue = (field: string) => {
    return product.normalized_data?.[field] || null
  }

  // Render the appropriate input component based on field type
  const renderEditableField = (field: keyof EditableFields, value: string) => {
    const error = validationErrors[field]
    
    // Dropdown fields
    if (field === 'machine_category') {
      return (
        <Select value={value} onValueChange={(val) => handleFieldChange(field, val)}>
          <SelectTrigger className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="laser">Laser Cutter</SelectItem>
            <SelectItem value="3d_printer">3D Printer</SelectItem>
            <SelectItem value="cnc">CNC Machine</SelectItem>
            <SelectItem value="vinyl">Vinyl Cutter</SelectItem>
          </SelectContent>
        </Select>
      )
    }
    
    if (field === 'laser_category') {
      return (
        <Select value={value} onValueChange={(val) => handleFieldChange(field, val)}>
          <SelectTrigger className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select laser type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desktop-diode-laser">Desktop Diode Laser</SelectItem>
            <SelectItem value="desktop-co2-laser">Desktop CO2 Laser</SelectItem>
            <SelectItem value="professional-co2-laser">Professional CO2 Laser</SelectItem>
            <SelectItem value="fiber-laser">Fiber Laser</SelectItem>
          </SelectContent>
        </Select>
      )
    }
    
    if (field === 'laser_type_a' || field === 'laser_type_b') {
      return (
        <Select value={value} onValueChange={(val) => handleFieldChange(field, val)}>
          <SelectTrigger className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select laser type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CO2">CO2</SelectItem>
            <SelectItem value="Diode">Diode</SelectItem>
            <SelectItem value="Fiber">Fiber</SelectItem>
            <SelectItem value="none">None (single laser)</SelectItem>
          </SelectContent>
        </Select>
      )
    }
    
    // Boolean fields (Yes/No checkboxes)
    const booleanFields = ['focus', 'enclosure', 'wifi', 'camera', 'air_assist', 'rotary', 'passthrough']
    if (booleanFields.includes(field)) {
      return (
        <Select value={value} onValueChange={(val) => handleFieldChange(field, val)}>
          <SelectTrigger className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="optional">Optional</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      )
    }
    
    // Multi-line fields
    if (field === 'description') {
      return (
        <Textarea
          value={value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder="Enter description"
          className={error ? 'border-red-500' : ''}
          rows={3}
        />
      )
    }
    
    // Regular text inputs
    return (
      <Input
        value={value}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        placeholder={`Enter ${field.replace('_', ' ')}`}
        className={error ? 'border-red-500' : ''}
      />
    )
  }

  // Reusable field component for 3-column layout
  const renderField = (field: keyof EditableFields, label: string, required = false) => (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label className="text-xs font-medium text-gray-600">Raw Scraped Value</Label>
        <div className="p-2 bg-gray-50 rounded text-xs border min-h-[36px] flex items-center break-all">
          {getRawMatchedValue(field) || 'No match found'}
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium text-blue-600">OpenAI Formatted</Label>
        <div className="p-2 bg-blue-50 rounded text-xs border min-h-[36px] flex items-center break-all">
          {getOpenAIFormattedValue(field) || 'Not processed'}
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium text-green-600">
          {label} {required && '*'}
        </Label>
        {renderEditableField(field, editableFields[field])}
        {validationErrors[field] && (
          <p className="text-xs text-red-600 mt-1">{validationErrors[field]}</p>
        )}
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Review Product Details
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="edit" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 mx-6 mt-4 mb-0">
            <TabsTrigger value="edit">Edit & Review</TabsTrigger>
            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full px-6">
              <div className="space-y-6 pr-4">
                {/* Basic Information */}
                <div>
                  <h3 className="font-semibold mb-4">Basic Information</h3>
                  <div className="space-y-4">
                    {renderField('name', 'Product Name', true)}
                    {renderField('brand', 'Brand', true)}
                    {renderField('price', 'Price (USD)', true)}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-4">Description</h3>
                  <div className="space-y-4">
                    {renderField('description', 'Description')}
                  </div>
                </div>

                {/* Machine Categories */}
                <div>
                  <h3 className="font-semibold mb-4">Machine Categories</h3>
                  <div className="space-y-4">
                    {renderField('machine_category', 'Machine Category', true)}
                    {renderField('laser_category', 'Laser Category', true)}
                  </div>
                </div>

                {/* Primary Laser Specifications */}
                <div>
                  <h3 className="font-semibold mb-4">Primary Laser Specifications</h3>
                  <div className="space-y-4">
                    {renderField('laser_type_a', 'Laser Type A', true)}
                    {renderField('laser_power_a', 'Laser Power A', true)}
                  </div>
                </div>

                {/* Secondary Laser Specifications */}
                <div>
                  <h3 className="font-semibold mb-4">Secondary Laser Specifications (Optional)</h3>
                  <div className="space-y-4">
                    {renderField('laser_type_b', 'Laser Type B')}
                    {renderField('laser_power_b', 'Laser Power B')}
                  </div>
                </div>

                {/* Physical Specifications */}
                <div>
                  <h3 className="font-semibold mb-4">Physical Specifications</h3>
                  <div className="space-y-4">
                    {renderField('work_area', 'Work Area')}
                    {renderField('machine_size', 'Machine Dimensions')}
                  </div>
                </div>

                {/* Performance Specifications */}
                <div>
                  <h3 className="font-semibold mb-4">Performance Specifications</h3>
                  <div className="space-y-4">
                    {renderField('speed', 'Max Speed')}
                    {renderField('software', 'Software')}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="font-semibold mb-4">Features</h3>
                  <div className="space-y-4">
                    {renderField('focus', 'Auto Focus')}
                    {renderField('enclosure', 'Enclosure')}
                    {renderField('wifi', 'WiFi')}
                    {renderField('camera', 'Camera')}
                    {renderField('air_assist', 'Air Assist')}
                    {renderField('rotary', 'Rotary Attachment')}
                    {renderField('passthrough', 'Passthrough')}
                  </div>
                </div>

                {/* Additional Specifications */}
                <div>
                  <h3 className="font-semibold mb-4">Additional Specifications</h3>
                  <div className="space-y-4">
                    {renderField('material', 'Frame Material')}
                    {renderField('connectivity', 'Connectivity')}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-6 border-t">
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving Changes...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="raw" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full px-6">
              <div className="space-y-4 pr-4">
                <div>
                  <h3 className="font-semibold mb-2">Raw Scrapfly Data</h3>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto border max-h-96 overflow-y-auto">
                    {JSON.stringify(product.raw_data, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Normalized OpenAI Data</h3>
                  <pre className="text-xs bg-blue-50 p-4 rounded overflow-x-auto border max-h-96 overflow-y-auto">
                    {JSON.stringify(product.normalized_data, null, 2)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="validation" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full px-6">
              <div className="space-y-4 pr-4">
                {product.validation_errors && product.validation_errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Validation Errors
                    </h4>
                    <div className="space-y-2">
                      {product.validation_errors.map((error, idx) => (
                        <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {product.validation_warnings && product.validation_warnings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Validation Warnings
                    </h4>
                    <div className="space-y-2">
                      {product.validation_warnings.map((warning, idx) => (
                        <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {(!product.validation_errors || product.validation_errors.length === 0) && 
                 (!product.validation_warnings || product.validation_warnings.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>All validations passed</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="images" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full px-6">
              <div className="space-y-4 pr-4">
                {((product.normalized_data?.images && product.normalized_data.images.length > 0) || 
                  (product.raw_data?.images && product.raw_data.images.length > 0)) ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(product.normalized_data?.images || product.raw_data?.images || []).map((img, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        <img 
                          src={typeof img === 'string' ? img : img.url} 
                          alt={`Product image ${idx + 1}`}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Image className="h-8 w-8 mx-auto mb-2" />
                    <p>No images found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        {/* Status and Actions Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <Badge variant={product.status === 'pending' ? 'secondary' : 
                           product.status === 'approved' ? 'default' : 'destructive'}>
              {product.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {product.raw_data?._credits_used && `${product.raw_data._credits_used} credits used`}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
