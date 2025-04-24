"use client"

import {
  Pagination as PaginationPrimitive,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination-primitive"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { useCallback } from "react"

interface PaginationProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  showPageLinks?: number
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  showPageLinks = 5,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  
  // Generate array of page numbers to show
  const getPageNumbers = useCallback(() => {
    const pageNumbers = []
    
    if (totalPages <= showPageLinks) {
      // Show all pages if less than showPageLinks
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Always show first page
      pageNumbers.push(1)
      
      // Calculate range around current page
      const leftSide = Math.floor(showPageLinks / 2)
      const rightSide = showPageLinks - leftSide - 1
      
      // Calculate start and end page
      let startPage = Math.max(2, currentPage - leftSide)
      let endPage = Math.min(totalPages - 1, currentPage + rightSide)
      
      // Adjust if range is too small on one side
      if (startPage === 2) endPage = Math.min(totalPages - 1, startPage + showPageLinks - 3)
      if (endPage === totalPages - 1) startPage = Math.max(2, endPage - showPageLinks + 3)
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push("ellipsis-start")
      }
      
      // Add pages in range
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push("ellipsis-end")
      }
      
      // Always show last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages)
      }
    }
    
    return pageNumbers
  }, [currentPage, totalPages, showPageLinks])
  
  // Create page numbers
  const pageNumbers = getPageNumbers()

  // Early return if only one page
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-center space-x-6 lg:space-x-8">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium">
          Page {currentPage} of {totalPages}
        </p>
      </div>
      <PaginationPrimitive>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              aria-disabled={currentPage === 1}
              tabIndex={currentPage === 1 ? -1 : 0}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          
          {pageNumbers.map((page, i) => {
            if (page === "ellipsis-start" || page === "ellipsis-end") {
              return (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              )
            }
            
            return (
              <PaginationItem key={`page-${page}`}>
                <PaginationLink
                  isActive={currentPage === page}
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              aria-disabled={currentPage === totalPages}
              tabIndex={currentPage === totalPages ? -1 : 0}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </PaginationPrimitive>
    </div>
  )
}
