import { Check } from "lucide-react"

interface ProductHighlightsProps {
  highlights: string[]
}

export function ProductHighlights({ highlights }: ProductHighlightsProps) {
  if (!highlights || highlights.length === 0) return null

  return (
    <ul className="mt-2 space-y-1">
      {highlights.slice(0, 2).map((highlight, index) => (
        <li key={index} className="flex items-start">
          <Check className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-gray-600 line-clamp-1">{highlight}</span>
        </li>
      ))}
    </ul>
  )
}

