"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface ProductTabsProps {
  sections: {
    id: string
    label: string
  }[]
  className?: string
}

export function ProductTabs({ sections, className }: ProductTabsProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "")

  // Handle scrolling to sections
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY
      // Subtract some pixels to account for the sticky header
      const offset = 100
      window.scrollTo({
        top: offsetTop - offset,
        behavior: "smooth",
      })
    }
  }

  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150 // Add offset for sticky header

      // Find the section that is currently in view
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id)
        if (section) {
          const sectionTop = section.offsetTop
          if (scrollPosition >= sectionTop) {
            setActiveSection(sections[i].id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    // Initial check for active section
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [sections])

  return (
    <div className={cn("sticky top-0 z-30 w-full bg-white border-b", className)}>
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="overflow-x-auto scrollbar-hide py-1">
          <nav className="flex space-x-1 min-w-max">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors",
                  activeSection === section.id
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
} 