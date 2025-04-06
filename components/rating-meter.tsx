import { cn } from "@/lib/utils"

interface RatingMeterProps {
  rating: number // Rating out of 10
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
  labelText?: string
  verified?: boolean
}

export default function RatingMeter({
  rating,
  size = "md",
  showLabel = true,
  className,
  labelText = "RATING",
  verified = false
}: RatingMeterProps) {
  // Define size dimensions
  const sizes = {
    sm: {
      fontSize: "text-xl",
      denominator: "text-xs",
      labelSize: "text-[10px]"
    },
    md: {
      fontSize: "text-4xl",
      denominator: "text-sm",
      labelSize: "text-xs"
    },
    lg: {
      fontSize: "text-6xl",
      denominator: "text-xl",
      labelSize: "text-sm"
    }
  }

  const { fontSize, denominator, labelSize } = sizes[size]

  // Color based on rating
  const getColorClass = () => {
    if (rating >= 9) return "text-green-600"
    if (rating >= 7) return "text-blue-600"
    if (rating >= 5) return "text-amber-600"
    if (rating >= 3) return "text-orange-600"
    return "text-red-600"
  }

  return (
    <div className={cn("flex flex-col items-end", className)}>
      <div className="flex items-baseline">
        <span className={cn("font-bold leading-none", fontSize, getColorClass())}>
          {rating === null || rating === undefined ? "N/A" : rating.toFixed(1)}
        </span>
        <span className={cn("text-gray-500 font-medium ml-0.5", denominator)}>/10</span>
      </div>
      
      {showLabel && (
        <div className={cn("font-semibold uppercase tracking-wider", labelSize, "text-gray-500")}>
          {verified && (
            <span className="inline-block mr-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-blue-500">
                <path fillRule="evenodd" d="M8.603 3.799A4.5 4.5 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.5 4.5 0 013.498 1.307 4.5 4.5 0 011.307 3.497A4.5 4.5 0 0121.75 12a4.5 4.5 0 01-1.549 3.397 4.5 4.5 0 01-1.307 3.497 4.5 4.5 0 01-3.497 1.307A4.5 4.5 0 0112 21.75a4.5 4.5 0 01-3.397-1.549 4.5 4.5 0 01-3.498-1.306 4.5 4.5 0 01-1.307-3.498A4.5 4.5 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.5 4.5 0 011.307-3.497 4.5 4.5 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
            </span>
          )}
          {labelText}
        </div>
      )}
    </div>
  )
} 