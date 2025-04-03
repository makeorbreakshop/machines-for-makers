"use client"

import { useState } from 'react'

// Row component for specs
function SpecRow({ 
  label, 
  value, 
  propName
}: { 
  label: string; 
  value: string | null;
  propName?: string;
}) {
  return value ? (
    <div 
      className="flex items-center justify-between p-3 hover:bg-muted/10" 
      itemProp="additionalProperty" 
      itemScope 
      itemType="https://schema.org/PropertyValue"
    >
      <meta itemProp="name" content={label} />
      <meta itemProp="value" content={value} />
      <div className="font-medium text-sm text-gray-700">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  ) : null;
}

// Client-side component for mobile-friendly specs selector
export function MobileSpecsSelector({ 
  product, 
  formattedPrice 
}: { 
  product: any, 
  formattedPrice: string
}) {
  const [activeTab, setActiveTab] = useState('basic')

  return (
    <div className="space-y-3 md:hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" id="mobile-specifications">
          Specifications
        </h2>
        <select 
          className="bg-muted/20 text-sm rounded-md py-1.5 pl-3 pr-8 focus:ring-1 focus:ring-primary"
          aria-label="Select specification category"
          onChange={(e) => setActiveTab(e.target.value)}
          value={activeTab}
        >
          <option value="basic">Basic Info</option>
          <option value="laser">Laser Specs</option>
          <option value="dimensions">Dimensions</option>
          <option value="performance">Performance</option>
          <option value="features">Features</option>
        </select>
      </div>
      
      <div className="rounded-lg overflow-hidden border divide-y">
        {activeTab === 'basic' && (
          <>
            <SpecRow label="Brand" value={product.company} propName="brand" />
            <SpecRow label="Price" value={formattedPrice} propName="price" />
            <SpecRow label="Expert Score" value={product.rating ? `${product.rating}/10` : null} propName="rating" />
            <SpecRow label="Warranty" value={product.warranty} propName="warranty" />
            <SpecRow label="Software" value={product.software} propName="software" />
          </>
        )}
        
        {activeTab === 'laser' && (
          <>
            <SpecRow label="Laser Type" value={product.laser_type_a} propName="laserType" />
            <SpecRow label="Power (W)" value={product.laser_power_a ? `${product.laser_power_a}` : null} propName="power" />
            <SpecRow label="Laser Source" value={product.laser_source_manufacturer} propName="laserSource" />
            <SpecRow label="Frequency" value={product.laser_frequency} propName="frequency" />
            <SpecRow label="Pulse Width" value={product.pulse_width} propName="pulseWidth" />
            {product.laser_power_b && (
              <SpecRow label="Secondary Laser" value={`${product.laser_power_b}W ${product.laser_type_b}`} propName="secondaryLaser" />
            )}
          </>
        )}
        
        {activeTab === 'dimensions' && (
          <>
            <SpecRow label="Work Area (mm)" value={product.work_area} propName="workArea" />
            <SpecRow label="Machine Size (mm)" value={product.machine_size} propName="machineSize" />
            <SpecRow label="Height (mm)" value={product.height} propName="height" />
          </>
        )}
        
        {activeTab === 'performance' && (
          <>
            <SpecRow label="Speed (mm/s)" value={product.speed} propName="speed" />
            <SpecRow label="Acceleration" value={product.acceleration} propName="acceleration" />
          </>
        )}
        
        {activeTab === 'features' && (
          <>
            <SpecRow label="Focus" value={product.focus} propName="focus" />
            <SpecRow label="Enclosure" value={product.enclosure} propName="enclosure" />
            <SpecRow label="WiFi" value={product.wifi} propName="wifi" />
            <SpecRow label="Camera" value={product.camera} propName="camera" />
            <SpecRow label="Passthrough" value={product.passthrough} propName="passthrough" />
            <SpecRow label="Controller" value={product.controller} propName="controller" />
          </>
        )}
      </div>
    </div>
  )
} 