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
  // Basic Information
  machine_name: string
  slug: string
  company: string
  machine_category: string
  laser_category: string
  price: string
  rating: string
  award: string
  is_featured: string
  hidden: string
  
  // Laser Configuration
  laser_type_a: string
  laser_power_a: string
  laser_type_b: string
  laser_power_b: string
  laser_source_manufacturer: string
  
  // Physical Specifications
  work_area: string
  machine_size: string
  height: string
  
  // Technical Specifications
  speed: string
  acceleration: string
  laser_frequency: string
  pulse_width: string
  focus: string
  
  // Features (Boolean)
  enclosure: string
  wifi: string
  camera: string
  passthrough: string
  
  // Software & Support
  controller: string
  software: string
  warranty: string
  
  // Content Fields
  excerpt_short: string
  description: string
  highlights: string
  drawbacks: string
  
  // Media & Links
  image_url: string
  product_link: string
  affiliate_link: string
  youtube_review: string
  
  // Image management
  selectedImages?: string[]
  primaryImage?: string
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
    if (!match) throw new Error('Format: "40" or "5.5" (number only)')
    const num = parseFloat(match[1])
    const unit = match[2].toLowerCase()
    if (unit === 'k') return `${num * 1000}`
    if (unit === 'm') return `${num / 1000}`
    return `${num}`
  },
  work_area: (value: string) => {
    const match = value.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(mm|cm|in)?$/i)
    if (!match) throw new Error('Format: "400x400 mm" (no spaces around x)')
    let w = parseFloat(match[1])
    let h = parseFloat(match[2])
    const unit = match[3]?.toLowerCase() || 'mm'
    
    if (unit === 'cm') { w *= 10; h *= 10 }
    if (unit === 'in') { w *= 25.4; h *= 25.4 }
    
    return `${Math.round(w)}x${Math.round(h)} mm`
  },
  speed: (value: string) => {
    const match = value.match(/^(\d+(?:\.\d+)?)\s*(mm\/min|mm\/s|m\/min)?$/i)
    if (!match) throw new Error('Format: "1200 mm/s"')
    let speed = parseFloat(match[1])
    const unit = match[2]?.toLowerCase() || 'mm/s'
    
    if (unit === 'mm/min') speed /= 60
    if (unit === 'm/min') speed = (speed * 1000) / 60
    
    return `${Math.round(speed)} mm/s`
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
    // Basic Information
    machine_name: '',
    slug: '',
    company: '',
    machine_category: 'laser',
    laser_category: 'desktop-diode-laser',
    price: '',
    rating: '',
    award: '',
    is_featured: 'no',
    hidden: 'yes', // Always default to draft
    
    // Laser Configuration
    laser_type_a: '',
    laser_power_a: '',
    laser_type_b: '',
    laser_power_b: '',
    laser_source_manufacturer: '',
    
    // Physical Specifications
    work_area: '',
    machine_size: '',
    height: '',
    
    // Technical Specifications
    speed: '',
    acceleration: '',
    laser_frequency: '',
    pulse_width: '',
    focus: '',
    
    // Features (Boolean)
    enclosure: '',
    wifi: '',
    camera: '',
    passthrough: '',
    
    // Software & Support
    controller: '',
    software: '',
    warranty: '',
    
    // Content Fields
    excerpt_short: '',
    description: '',
    highlights: '',
    drawbacks: '',
    
    // Media & Links
    image_url: '',
    product_link: '',
    affiliate_link: '',
    youtube_review: ''
  })
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Helper function to get image URL
  const getImageUrl = (img: any): string => {
    let url = ''
    
    if (typeof img === 'string') {
      url = img
    } else if (img?.url) {
      url = img.url
    }
    
    if (!url) return ''
    
    // Handle relative URLs (//domain.com/image.jpg)
    if (url.startsWith('//')) {
      return `https:${url}`
    }
    
    // Convert HTTP to HTTPS for security and mixed content issues
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://')
    }
    
    return url
  }

  // Helper function to get available images
  const getAvailableImages = () => {
    if (!product) return []
    
    console.log('🔍 DEBUG getAvailableImages:');
    console.log('Product:', product);
    console.log('Raw data:', product.raw_data);
    console.log('Normalized data:', product.normalized_data);
    
    const rawImages = product.raw_data?.raw_data?.images || product.raw_data?.images || []
    const normalizedImages = product.normalized_data?.images || []
    
    console.log('Raw images:', rawImages);
    console.log('Normalized images:', normalizedImages);
    
    // Combine all available images and remove duplicates
    const allImages = [...rawImages, ...normalizedImages]
    console.log('All images before dedup:', allImages);
    
    const seen = new Set()
    const result = allImages.filter(img => {
      const url = getImageUrl(img)
      console.log('Processing image:', img, '→ URL:', url);
      if (seen.has(url)) return false
      seen.add(url)
      return true
    })
    
    console.log('Final images array:', result);
    return result
  }

  // Helper to convert OpenAI values to dropdown-compatible values
  const convertToDropdownValue = (value: string | undefined, fieldType: string): string => {
    if (!value) return ''
    
    const lowerValue = value.toLowerCase()
    
    // Boolean field conversion (Yes/No/Optional → yes/no/optional)
    if (['focus', 'enclosure', 'wifi', 'camera', 'passthrough', 'is_featured', 'hidden'].includes(fieldType)) {
      if (lowerValue === 'yes' || lowerValue === 'true' || lowerValue === 'auto') return 'yes'
      if (lowerValue === 'no' || lowerValue === 'false' || lowerValue === 'manual') return 'no'
      if (lowerValue === 'optional') return 'optional'
      return ''  // Empty means "Select option" placeholder
    }
    
    return value
  }

  // Initialize fields when product changes
  useEffect(() => {
    if (product && isOpen) {
      const images = getAvailableImages()
      const imageUrls = images.map(img => getImageUrl(img))
      
      setEditableFields({
        // Basic Information
        machine_name: product.normalized_data?.name || product.raw_data?.name || product.raw_data?.title || '',
        slug: product.normalized_data?.slug || '',
        company: product.normalized_data?.brand || product.raw_data?.brand || product.raw_data?.manufacturer || '',
        machine_category: product.normalized_data?.machine_category || 'laser',
        laser_category: product.normalized_data?.laser_category || 'desktop-diode-laser',
        price: product.normalized_data?.price?.toString() || product.raw_data?.price?.toString() || '',
        rating: product.normalized_data?.rating?.toString() || '',
        award: product.normalized_data?.award || '',
        is_featured: convertToDropdownValue(product.normalized_data?.is_featured, 'is_featured'),
        hidden: 'yes', // Always default to draft regardless of OpenAI value
        
        // Laser Configuration
        laser_type_a: product.normalized_data?.laser_type_a || '',
        laser_power_a: product.normalized_data?.laser_power_a || '',
        laser_type_b: product.normalized_data?.laser_type_b || '',
        laser_power_b: product.normalized_data?.laser_power_b || '',
        laser_source_manufacturer: product.normalized_data?.laser_source_manufacturer || '',
        
        // Physical Specifications
        work_area: product.normalized_data?.work_area || '',
        machine_size: product.normalized_data?.machine_size || '',
        height: product.normalized_data?.height || '',
        
        // Technical Specifications
        speed: product.normalized_data?.speed || '',
        acceleration: product.normalized_data?.acceleration || '',
        laser_frequency: product.normalized_data?.laser_frequency || '',
        pulse_width: product.normalized_data?.pulse_width || '',
        focus: convertToDropdownValue(product.normalized_data?.focus, 'focus'),
        
        // Features (Boolean)
        enclosure: convertToDropdownValue(product.normalized_data?.enclosure, 'enclosure'),
        wifi: convertToDropdownValue(product.normalized_data?.wifi, 'wifi'),
        camera: convertToDropdownValue(product.normalized_data?.camera, 'camera'),
        passthrough: convertToDropdownValue(product.normalized_data?.passthrough, 'passthrough'),
        
        // Software & Support
        controller: product.normalized_data?.controller || '',
        software: product.normalized_data?.software || '',
        warranty: product.normalized_data?.warranty || '',
        
        // Content Fields
        excerpt_short: product.normalized_data?.excerpt_short || '',
        description: product.normalized_data?.description || product.raw_data?.description || '',
        highlights: product.normalized_data?.highlights || '',
        drawbacks: product.normalized_data?.drawbacks || '',
        
        // Media & Links
        image_url: product.normalized_data?.image_url || '',
        product_link: product.normalized_data?.product_link || product.raw_data?.url || product.raw_data?.product_url || product.raw_data?.link || '',
        affiliate_link: product.normalized_data?.affiliate_link || '',
        youtube_review: product.normalized_data?.youtube_review || '',
        
        // Image management - initialize with existing selected images or first image as primary
        selectedImages: product.normalized_data?.images || (imageUrls.length > 0 ? [imageUrls[0]] : []),
        primaryImage: product.normalized_data?.images?.[0] || imageUrls[0] || ''
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
      
      // Prepare the update payload with images
      const updatePayload = {
        normalized_data: {
          ...formattedFields,
          images: editableFields.selectedImages || [],
          primary_image: editableFields.primaryImage || ''
        }
      }

      const response = await fetch(`/api/admin/discovered-machines/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
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

  const toggleImageSelection = (imageUrl: string) => {
    setEditableFields(prev => {
      const currentSelected = prev.selectedImages || []
      if (currentSelected.includes(imageUrl)) {
        // Remove from selection
        const newSelected = currentSelected.filter(url => url !== imageUrl)
        return {
          ...prev,
          selectedImages: newSelected,
          // If removing primary image, set new primary
          primaryImage: prev.primaryImage === imageUrl ? (newSelected[0] || '') : prev.primaryImage
        }
      } else {
        // Add to selection
        const newSelected = [...currentSelected, imageUrl]
        return {
          ...prev,
          selectedImages: newSelected,
          // If no primary set, make this the primary
          primaryImage: prev.primaryImage || imageUrl
        }
      }
    })
  }

  const setPrimaryImage = (imageUrl: string) => {
    setEditableFields(prev => ({
      ...prev,
      primaryImage: imageUrl,
      // Ensure primary image is in selected images
      selectedImages: prev.selectedImages?.includes(imageUrl) 
        ? prev.selectedImages 
        : [...(prev.selectedImages || []), imageUrl]
    }))
  }

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
      // Basic Information
      case 'machine_name':
        return searchInObject(rawData, ['name', 'title', 'machine_name', 'product_name'])
      case 'slug':
        return searchInObject(rawData, ['slug', 'url_slug'])
      case 'company':
        return searchInObject(rawData, ['brand', 'manufacturer', 'vendor', 'company'])
      case 'machine_category':
        return searchInObject(rawData, ['category', 'type', 'machine_type'])
      case 'laser_category':
        return searchInObject(rawData, ['subcategory', 'laser_type', 'category'])
      case 'price':
        return rawData.price || rawData.offers?.[0]?.price || searchInObject(rawData, ['cost', 'price_usd', 'msrp'])
      case 'rating':
        return searchInObject(rawData, ['rating', 'score', 'review_score'])
      case 'award':
        return searchInObject(rawData, ['award', 'recognition', 'badge'])
      case 'is_featured':
        return searchInObject(rawData, ['featured', 'is_featured', 'highlight'])
      case 'hidden':
        return searchInObject(rawData, ['hidden', 'published', 'visible'])
      
      // Laser Configuration
      case 'laser_type_a':
        return searchInSpecs(['laser type', 'laser', 'type']) || searchInObject(rawData, ['laser_type', 'type'])
      case 'laser_power_a':
        return searchInSpecs(['power', 'watt', 'laser power']) || searchInObject(rawData, ['power', 'laser_power', 'wattage'])
      case 'laser_type_b':
        return searchInSpecs(['secondary laser', 'laser b', 'second laser', 'dual laser'])
      case 'laser_power_b':
        return searchInSpecs(['secondary power', 'power b', 'second power', 'dual power'])
      case 'laser_source_manufacturer':
        return searchInSpecs(['laser source', 'laser manufacturer', 'diode manufacturer']) || searchInObject(rawData, ['laser_source'])
      
      // Physical Specifications
      case 'work_area':
        return searchInSpecs(['work area', 'working area', 'bed size', 'cutting area']) || searchInObject(rawData, ['work_area', 'bed_size'])
      case 'machine_size':
        return searchInSpecs(['machine size', 'dimensions', 'product dimensions', 'overall dimensions']) || searchInObject(rawData, ['dimensions', 'size'])
      case 'height':
        return searchInSpecs(['height', 'z-axis', 'clearance', 'max height']) || searchInObject(rawData, ['height', 'z_axis'])
      
      // Technical Specifications
      case 'speed':
        return searchInSpecs(['speed', 'max speed', 'cutting speed', 'engraving speed']) || searchInObject(rawData, ['speed', 'max_speed'])
      case 'acceleration':
        return searchInSpecs(['acceleration', 'accel']) || searchInObject(rawData, ['acceleration'])
      case 'laser_frequency':
        return searchInSpecs(['frequency', 'laser frequency', 'hz']) || searchInObject(rawData, ['frequency'])
      case 'pulse_width':
        return searchInSpecs(['pulse width', 'pulse', 'modulation']) || searchInObject(rawData, ['pulse_width'])
      case 'focus':
        return searchInSpecs(['focus', 'autofocus', 'focus mode', 'z-axis focus']) || searchInObject(rawData, ['focus', 'autofocus'])
      
      // Features (Boolean)
      case 'enclosure':
        return searchInSpecs(['enclosure', 'enclosed', 'housing', 'safety enclosure']) || searchInObject(rawData, ['enclosure', 'enclosed'])
      case 'wifi':
        return searchInSpecs(['wifi', 'wireless', 'wi-fi', 'connection', 'network']) || searchInObject(rawData, ['wifi', 'wireless'])
      case 'camera':
        return searchInSpecs(['camera', 'built-in camera', 'vision', 'monitoring camera']) || searchInObject(rawData, ['camera', 'vision'])
      case 'passthrough':
        return searchInSpecs(['passthrough', 'pass through', 'pass-through', 'door design']) || searchInObject(rawData, ['passthrough'])
      
      // Software & Support
      case 'controller':
        return searchInSpecs(['controller', 'control board', 'mainboard', 'motherboard']) || searchInObject(rawData, ['controller'])
      case 'software':
        return searchInSpecs(['software', 'supported software', 'compatible software', 'recommended software']) || searchInObject(rawData, ['software'])
      case 'warranty':
        return searchInSpecs(['warranty', 'guarantee', 'support period']) || searchInObject(rawData, ['warranty'])
      
      // Content Fields
      case 'excerpt_short':
        return searchInObject(rawData, ['excerpt', 'summary', 'short_description', 'tagline'])
      case 'description':
        return searchInObject(rawData, ['description', 'description_markdown', 'summary', 'overview', 'long_description'])
      case 'highlights':
        return searchInObject(rawData, ['highlights', 'features', 'key_features', 'pros', 'benefits'])
      case 'drawbacks':
        return searchInObject(rawData, ['drawbacks', 'cons', 'limitations', 'disadvantages'])
      
      // Media & Links
      case 'image_url':
        return rawData.images?.[0] || searchInObject(rawData, ['image', 'main_image', 'primary_image'])
      case 'product_link':
        return rawData.url || rawData.product_url || rawData.link || rawData.official_link || searchInObject(rawData, ['canonical_url', 'page_url', 'source_url'])
      case 'affiliate_link':
        return searchInObject(rawData, ['affiliate_link', 'buy_link', 'purchase_link'])
      case 'youtube_review':
        return searchInObject(rawData, ['youtube', 'video_review', 'review_video'])
      
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
    
    // Boolean fields (Yes/No/Optional dropdowns)
    const booleanFields = ['focus', 'enclosure', 'wifi', 'camera', 'passthrough', 'is_featured', 'hidden']
    if (booleanFields.includes(field)) {
      // Special case for hidden field (inverted logic)
      if (field === 'hidden') {
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field, val)}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Hidden (Draft)</SelectItem>
              <SelectItem value="no">Published (Live)</SelectItem>
            </SelectContent>
          </Select>
        )
      }
      
      return (
        <Select value={value} onValueChange={(val) => handleFieldChange(field, val)}>
          <SelectTrigger className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
            {field !== 'is_featured' && field !== 'hidden' && (
              <>
                <SelectItem value="optional">Optional</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      )
    }
    
    // Multi-line fields
    const textareaFields = ['description', 'highlights', 'drawbacks', 'excerpt_short']
    if (textareaFields.includes(field)) {
      const rows = field === 'excerpt_short' ? 2 : field === 'description' ? 4 : 3
      return (
        <Textarea
          value={value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={`Enter ${field.replace('_', ' ')}`}
          className={error ? 'border-red-500' : ''}
          rows={rows}
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

  // Helper to safely render any value as string
  const safeRenderValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'boolean') return value.toString()
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return '[Complex Object]'
      }
    }
    return String(value)
  }

  // Reusable field component for 3-column layout
  const renderField = (field: keyof EditableFields, label: string, required = false) => (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label className="text-xs font-medium text-gray-600">Raw Scraped Value</Label>
        <div className="p-2 bg-gray-50 rounded text-xs border min-h-[36px] flex items-center break-all">
          {safeRenderValue(getRawMatchedValue(field)) || 'No match found'}
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium text-blue-600">OpenAI Formatted</Label>
        <div className="p-2 bg-blue-50 rounded text-xs border min-h-[36px] flex items-center break-all">
          {safeRenderValue(getOpenAIFormattedValue(field)) || 'Not processed'}
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
                    {renderField('machine_name', 'Machine Name', true)}
                    {renderField('slug', 'URL Slug')}
                    {renderField('company', 'Brand/Company', true)}
                    {renderField('machine_category', 'Machine Category', true)}
                    {renderField('laser_category', 'Laser Category', true)}
                    {renderField('price', 'Price (USD)', true)}
                    {renderField('rating', 'Rating (0-10)')}
                    {renderField('award', 'Award/Recognition')}
                    {renderField('is_featured', 'Featured Machine')}
                    {renderField('hidden', 'Publication Status')}
                  </div>
                </div>

                {/* Laser Configuration */}
                <div>
                  <h3 className="font-semibold mb-4">Laser Configuration</h3>
                  <div className="space-y-4">
                    {renderField('laser_type_a', 'Primary Laser Type', true)}
                    {renderField('laser_power_a', 'Primary Laser Power', true)}
                    {renderField('laser_type_b', 'Secondary Laser Type')}
                    {renderField('laser_power_b', 'Secondary Laser Power')}
                    {renderField('laser_source_manufacturer', 'Laser Source Manufacturer')}
                  </div>
                </div>

                {/* Physical Specifications */}
                <div>
                  <h3 className="font-semibold mb-4">Physical Specifications</h3>
                  <div className="space-y-4">
                    {renderField('work_area', 'Work Area', true)}
                    {renderField('machine_size', 'Machine Dimensions')}
                    {renderField('height', 'Z-Axis Height/Clearance')}
                  </div>
                </div>

                {/* Technical Specifications */}
                <div>
                  <h3 className="font-semibold mb-4">Technical Specifications</h3>
                  <div className="space-y-4">
                    {renderField('speed', 'Maximum Speed', true)}
                    {renderField('acceleration', 'Acceleration')}
                    {renderField('laser_frequency', 'Laser Frequency (Hz)')}
                    {renderField('pulse_width', 'Pulse Width')}
                    {renderField('focus', 'Focus Type')}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="font-semibold mb-4">Features</h3>
                  <div className="space-y-4">
                    {renderField('enclosure', 'Enclosure')}
                    {renderField('wifi', 'WiFi Connectivity')}
                    {renderField('camera', 'Built-in Camera')}
                    {renderField('passthrough', 'Passthrough Capability')}
                  </div>
                </div>

                {/* Software & Support */}
                <div>
                  <h3 className="font-semibold mb-4">Software & Support</h3>
                  <div className="space-y-4">
                    {renderField('controller', 'Controller Type')}
                    {renderField('software', 'Compatible Software')}
                    {renderField('warranty', 'Warranty Information')}
                  </div>
                </div>

                {/* Content Fields */}
                <div>
                  <h3 className="font-semibold mb-4">Content & Description</h3>
                  <div className="space-y-4">
                    {renderField('excerpt_short', 'Short Excerpt')}
                    {renderField('description', 'Full Description')}
                    {renderField('highlights', 'Key Highlights/Features')}
                    {renderField('drawbacks', 'Limitations/Drawbacks')}
                  </div>
                </div>

                {/* Media & Links */}
                <div>
                  <h3 className="font-semibold mb-4">Media & Links</h3>
                  <div className="space-y-4">
                    {renderField('image_url', 'Primary Image URL')}
                    {renderField('product_link', 'Official Product Link')}
                    {renderField('affiliate_link', 'Affiliate/Purchase Link')}
                    {renderField('youtube_review', 'YouTube Review Link')}
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
                  (product.raw_data?.raw_data?.images && product.raw_data.raw_data.images.length > 0) ||
                  (product.raw_data?.images && product.raw_data.images.length > 0)) ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Available Images</h3>
                      <Badge variant="secondary">
                        {getAvailableImages().length} images found
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getAvailableImages().map((img, idx) => {
                        const imageUrl = getImageUrl(img)
                        const isSelected = editableFields.selectedImages?.includes(imageUrl)
                        const isPrimary = editableFields.primaryImage === imageUrl
                        
                        return (
                          <div key={idx} className="relative">
                            <div className={`border-2 rounded-lg overflow-hidden ${
                              isSelected ? 'border-blue-500' : 'border-gray-200'
                            }`}>
                              <div className="aspect-square">
                                <img 
                                  src={imageUrl}
                                  alt={`Product ${idx + 1}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block'
                                  }}
                                />
                              </div>
                              
                              <div className="p-2 bg-gray-50">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={isSelected ? "default" : "secondary"}
                                    onClick={() => toggleImageSelection(imageUrl)}
                                    className="flex-1 text-xs"
                                  >
                                    {isSelected ? "Selected" : "Select"}
                                  </Button>
                                  {isSelected && (
                                    <Button
                                      size="sm"
                                      variant={isPrimary ? "default" : "outline"}
                                      onClick={() => setPrimaryImage(imageUrl)}
                                      className="flex-1 text-xs"
                                    >
                                      {isPrimary ? "Primary" : "Set Primary"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Badges */}
                            <div className="absolute top-2 left-2 flex gap-1">
                              {isSelected && (
                                <Badge variant="default" className="text-xs">
                                  Selected
                                </Badge>
                              )}
                              {isPrimary && (
                                <Badge variant="destructive" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                            </div>
                            
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-xs">
                                {idx + 1}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Selected images summary */}
                    {editableFields.selectedImages && editableFields.selectedImages.length > 0 && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">
                          Selected Images ({editableFields.selectedImages.length})
                        </h4>
                        <div className="text-sm text-blue-700">
                          <p>Primary: {editableFields.primaryImage ? 'Set' : 'Not set'}</p>
                          <p>Additional: {(editableFields.selectedImages.length - 1)} images</p>
                        </div>
                      </div>
                    )}
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
