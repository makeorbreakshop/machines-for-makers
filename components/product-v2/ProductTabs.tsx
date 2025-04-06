"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface Section {
  id: string
  label: string
}

interface ProductTabsProps {
  sections: Section[]
  activeSection?: string
  className?: string
  showAtAGlance?: boolean
}

export function ProductTabs({ sections, activeSection, className, showAtAGlance = false }: ProductTabsProps) {
  const [current, setCurrent] = useState<string | undefined>(activeSection || sections[0]?.id)
  const [hasAtAGlanceElement, setHasAtAGlanceElement] = useState<boolean>(false)
  
  // Check if at-a-glance element exists on mount
  useEffect(() => {
    const atAGlanceElement = document.getElementById("at-a-glance")
    setHasAtAGlanceElement(!!atAGlanceElement)
  }, [])
  
  // Track scroll position to highlight the correct tab
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100 // Offset

      // Find the section that is currently in view
      const atAGlanceElement = document.getElementById("at-a-glance")
      if (atAGlanceElement) {
        const top = atAGlanceElement.offsetTop
        const height = atAGlanceElement.offsetHeight
        
        if (scrollPosition >= top && scrollPosition < top + height) {
          setCurrent("at-a-glance")
          return
        }
      }
      
      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (!element) continue
        
        const top = element.offsetTop
        const height = element.offsetHeight
        
        if (scrollPosition >= top && scrollPosition < top + height) {
          setCurrent(section.id)
          break
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [sections])

  return (
    <div className={cn("sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm", className)}>
      <div className="container px-4 mx-auto max-w-5xl">
        <div className="flex overflow-x-auto scrollbar-hide gap-8">
          {(hasAtAGlanceElement || showAtAGlance) && (
            <Link
              href="#at-a-glance"
              className={cn(
                "flex-shrink-0 uppercase text-sm font-medium py-4 border-b-2 transition-colors",
                current === "at-a-glance" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              At A Glance
            </Link>
          )}
          
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "flex-shrink-0 uppercase text-sm font-medium py-4 border-b-2 transition-colors",
                current === section.id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              {section.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
} 