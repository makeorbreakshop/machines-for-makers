import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import ConfigPage from './page'

describe('Price Tracker Configuration Page', () => {
  it('renders the configuration form', () => {
    render(<ConfigPage />)
    
    expect(screen.getByText('Price Tracker Configuration')).toBeInTheDocument()
    expect(screen.getByLabelText('Machine ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Variant')).toBeInTheDocument()
  })

  it('loads machine configuration on submit', async () => {
    render(<ConfigPage />)
    
    const machineIdInput = screen.getByLabelText('Machine ID')
    const loadButton = screen.getByText('Load Configuration')

    fireEvent.change(machineIdInput, { 
      target: { value: '123e4567-e89b-12d3-a456-426614174000' } 
    })
    fireEvent.click(loadButton)

    await waitFor(() => {
      expect(screen.getByText('Configuration loaded successfully')).toBeInTheDocument()
    })
  })

  it('updates configuration settings', async () => {
    render(<ConfigPage />)
    
    const confidenceInput = screen.getByLabelText('Minimum Extraction Confidence')
    const saveButton = screen.getByText('Save Configuration')

    fireEvent.change(confidenceInput, { target: { value: '0.90' } })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument()
    })
  })
}) 