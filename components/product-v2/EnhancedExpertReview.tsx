"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { QuoteIcon } from "lucide-react"

interface EnhancedExpertReviewProps {
  review: string | null
  brandonsTake: string | null
  className?: string
}

export function EnhancedExpertReview({ 
  review, 
  brandonsTake, 
  className = "" 
}: EnhancedExpertReviewProps) {
  // Use full review if available, otherwise fallback to Brandon's Take
  const reviewContent = review || brandonsTake
  
  // Don't render if no review content is available
  if (!reviewContent) {
    return null;
  }

  // Determine review type for display
  const isFullReview = !!review
  
  return (
    <section 
      className={cn(
        "py-10 md:py-16 bg-gradient-to-b from-white to-gray-50",
        className
      )} 
      itemProp="review" 
      itemScope 
      itemType="https://schema.org/Review"
    >
      <div className="container px-4 mx-auto max-w-5xl">
        <div className="max-w-4xl mx-auto">
          {/* Expert review header */}
          <div className="mb-10 flex flex-col sm:flex-row sm:items-center">
            <div className="flex items-center mb-4 sm:mb-0">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mr-4 border-2 border-primary/20">
                  B
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs font-bold py-1 px-2 rounded-full">
                  Expert
                </div>
              </div>
              <div>
                <h3 className="font-bold text-2xl text-gray-900 mb-1" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <span itemProp="name">Brandon's Review</span>
                </h3>
                <Badge variant="outline" className="text-sm py-1 px-3 font-medium bg-white shadow-sm border-gray-200">
                  Founder, Machines for Makers
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Featured quote - could be extracted from review or hardcoded */}
          <div className="mb-8 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 relative">
            <QuoteIcon className="h-12 w-12 text-primary/20 absolute top-4 left-4" />
            <blockquote className="text-xl md:text-2xl text-gray-800 font-medium italic ml-8 relative z-10">
              "Expert hands-on review from someone who's tested dozens of machines"
            </blockquote>
          </div>
          
          {/* Review content with enhanced typography */}
          <div 
            className="prose prose-sm md:prose-base lg:prose-lg prose-slate max-w-none
              bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8
              
              prose-headings:font-bold 
              prose-headings:text-gray-900
              prose-headings:mb-4
              prose-headings:mt-8
              
              prose-h2:text-2xl 
              prose-h2:md:text-3xl
              prose-h2:leading-tight
              prose-h2:border-b
              prose-h2:border-gray-100
              prose-h2:pb-3
              
              prose-h3:text-xl 
              prose-h3:md:text-2xl
              prose-h3:leading-tight
              
              prose-p:text-base
              prose-p:md:text-lg
              prose-p:leading-relaxed
              prose-p:text-gray-700
              
              prose-li:text-base
              prose-li:md:text-lg
              prose-li:marker:text-primary
              
              prose-a:text-primary
              prose-a:font-medium
              prose-a:no-underline
              prose-a:border-b
              prose-a:border-primary/30
              prose-a:hover:border-primary
              
              prose-strong:font-bold
              prose-strong:text-gray-900
              
              prose-blockquote:border-l-4
              prose-blockquote:border-primary/30
              prose-blockquote:bg-gray-50
              prose-blockquote:rounded-r-lg
              prose-blockquote:pl-5
              prose-blockquote:py-2
              prose-blockquote:pr-4
              prose-blockquote:italic
              prose-blockquote:text-gray-700
              
              prose-img:rounded-lg
              prose-img:shadow-md
              
              first-of-type:prose-p:text-xl first-of-type:prose-p:font-medium"
            itemProp="reviewBody"
            dangerouslySetInnerHTML={{ __html: reviewContent }}
          />
          
          <meta itemProp="reviewRating" content="5" />
        </div>
      </div>
    </section>
  )
} 