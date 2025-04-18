import { http, HttpResponse } from 'msw'

// Mock data
const mockMachine = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  "Machine Name": "Test Laser Cutter",
  "Company": "Test Company",
  price: 1999.99,
  product_link: "https://example.com/product"
}

const mockPriceHistory = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  machine_id: mockMachine.id,
  price: 1999.99,
  date: new Date().toISOString(),
  currency: 'USD',
  variant_attribute: 'DEFAULT',
  tier: 'STATIC',
  extracted_confidence: 0.95
}

export const handlers = [
  // Get machine configuration
  http.get('/api/v1/machines/:machine_id/config', () => {
    return HttpResponse.json({
      success: true,
      config: {
        machine_id: mockMachine.id,
        variant_attribute: 'DEFAULT',
        requires_js_interaction: false,
        min_extraction_confidence: 0.85,
        min_validation_confidence: 0.90,
        sanity_check_threshold: 0.25
      }
    })
  }),

  // Update machine configuration
  http.post('/api/v1/machines/:machine_id/config', () => {
    return HttpResponse.json({
      success: true,
      message: 'Configuration updated successfully'
    })
  }),

  // Get price history
  http.get('/api/v1/machines/:machine_id/price-history', () => {
    return HttpResponse.json({
      success: true,
      history: [mockPriceHistory]
    })
  }),

  // Update price
  http.post('/api/v1/machines/:machine_id/update-price', () => {
    return HttpResponse.json({
      success: true,
      price: mockPriceHistory
    })
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      version: '1.0.0'
    })
  })
] 