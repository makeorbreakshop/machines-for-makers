"use client"

import { cn } from "@/lib/utils"
import { ThumbsUp, ThumbsDown, Flag } from "lucide-react"

interface AtAGlanceProps {
  highlights: string[]
  drawbacks: string[]
  verdict: string | null | undefined
  product?: any
  className?: string
}

export function AtAGlance({ highlights, drawbacks, verdict, product, className }: AtAGlanceProps) {
  // If we don't have any of the required data, don't display the component
  if ((highlights.length === 0) && (drawbacks.length === 0) && !verdict) {
    return null
  }
  
  return (
    <div id="at-a-glance" className={cn("bg-gray-50", className)}>
      <div className="container px-4 mx-auto max-w-5xl py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {/* HIGHS */}
          {highlights.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <ThumbsUp className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="font-bold text-lg text-gray-800">HIGHS</h3>
              </div>
              <div className="text-gray-700 space-y-3">
                {highlights.map((highlight, index) => (
                  <div key={index} className="flex">
                    <span className="text-green-600 mr-2">•</span>
                    <p>{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* LOWS */}
          {drawbacks.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <ThumbsDown className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="font-bold text-lg text-gray-800">LOWS</h3>
              </div>
              <div className="text-gray-700 space-y-3">
                {drawbacks.map((drawback, index) => (
                  <div key={index} className="flex">
                    <span className="text-red-600 mr-2">•</span>
                    <p>{drawback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* VERDICT (Brandon's Take) */}
          {verdict && (
            <div>
              <div className="flex items-center mb-4">
                <Flag className="w-5 h-5 text-primary mr-2" />
                <h3 className="font-bold text-lg text-gray-800">VERDICT</h3>
              </div>
              <div className="text-gray-700">
                <p className="italic font-medium">{verdict}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 