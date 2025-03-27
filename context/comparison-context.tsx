"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { Machine } from "@/lib/database-types"

interface ComparisonContextType {
  selectedProducts: Machine[]
  addToComparison: (product: Machine) => void
  removeFromComparison: (productId: string) => void
  clearComparison: () => void
  isSelected: (productId: string) => boolean
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined)

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [selectedProducts, setSelectedProducts] = useState<Machine[]>([])

  const addToComparison = (product: Machine) => {
    if (selectedProducts.length < 8 && !isSelected(product.id)) {
      setSelectedProducts([...selectedProducts, product])
    }
  }

  const removeFromComparison = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId))
  }

  const clearComparison = () => {
    setSelectedProducts([])
  }

  const isSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId)
  }

  return (
    <ComparisonContext.Provider
      value={{
        selectedProducts,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isSelected,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  )
}

export function useComparison() {
  const context = useContext(ComparisonContext)
  if (context === undefined) {
    throw new Error("useComparison must be used within a ComparisonProvider")
  }
  return context
}

