import React from 'react';
import { SpecificationsTable } from './SpecificationsTable';
import { MobileSpecsSelector } from './MobileSpecsSelector';

interface SpecificationsTabProps {
  product: any;
}

export function SpecificationsTab({ product }: SpecificationsTabProps) {
  return (
    <section className="py-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Technical Specifications</h2>
        
        {/* Desktop view - Full specifications table */}
        <div className="hidden md:block">
          <SpecificationsTable product={product} />
        </div>
        
        {/* Mobile view - Accordion or selector style specs */}
        <div className="md:hidden">
          <MobileSpecsSelector product={product} />
        </div>
        
        {/* Download button for specs/manual if available */}
        {product.manual_url && (
          <div className="mt-6 text-center">
            <a 
              href={product.manual_url}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Product Manual
            </a>
          </div>
        )}
      </div>
    </section>
  );
} 