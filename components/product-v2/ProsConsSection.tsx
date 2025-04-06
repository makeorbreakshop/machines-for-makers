"use client"

import { CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProsConsSectionProps {
  highlights: string[]
  drawbacks: string[]
  className?: string
}

export function ProsConsSection({ highlights, drawbacks, className }: ProsConsSectionProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
      <div className="bg-green-50 border border-green-100 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
          <h3 className="text-xl font-bold text-green-900">Pros</h3>
        </div>
        <ul className="space-y-3">
          {highlights.map((highlight, index) => (
            <li key={index} className="flex">
              <div className="flex-shrink-0 pt-1">
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
              </div>
              <div className="ml-3 text-green-900">{highlight}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <XCircle className="h-6 w-6 text-red-600 mr-2" />
          <h3 className="text-xl font-bold text-red-900">Cons</h3>
        </div>
        <ul className="space-y-3">
          {drawbacks.map((drawback, index) => (
            <li key={index} className="flex">
              <div className="flex-shrink-0 pt-1">
                <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-3 w-3 text-red-600" />
                </div>
              </div>
              <div className="ml-3 text-red-900">{drawback}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
} 