"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Container } from "@/components/ui/container"

interface ExpertReviewProps {
  review: string | null
  brandonsTake: string | null
  className?: string
}

export default function ExpertReview({ review, brandonsTake, className = "" }: ExpertReviewProps) {
  // Debug what's being received
  console.log("ExpertReview component received:", { 
    review: review ? `Review content (${review.length} chars)` : "No review content", 
    brandonsTake: brandonsTake ? `Brandon's Take content (${brandonsTake.length} chars)` : "No Brandon's Take content" 
  });

  // Use full review if available, otherwise fallback to Brandon's Take
  const reviewContent = review || brandonsTake
  
  // Don't render if no review content is available
  if (!reviewContent) {
    console.log("ExpertReview component: No content to display, not rendering");
    return null;
  }

  // Determine review type for display
  const isFullReview = !!review
  
  console.log("ExpertReview component: Rendering with content type:", isFullReview ? "Full Review" : "Brandon's Take");
  
  return (
    <section 
      className={cn(
        "py-10 md:py-14 lg:py-16 bg-gradient-to-b from-white to-gray-50/50",
        className
      )} 
      itemProp="review" 
      itemScope 
      itemType="https://schema.org/Review"
    >
      <Container>
        <div className="max-w-3xl mx-auto">
          {/* Author section with improved visual hierarchy */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center">
            <div className="flex items-center mb-3 sm:mb-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg mr-3">
                B
              </div>
              <h3 className="font-bold text-xl text-gray-900" itemProp="author" itemScope itemType="https://schema.org/Person">
                <span itemProp="name">Brandon</span>
              </h3>
            </div>
            <Badge variant="outline" className="text-sm py-1 px-3 font-medium sm:ml-3 bg-white shadow-sm border-gray-200">
              Founder, Machines for Makers
            </Badge>
          </div>
          
          {/* Improved content styling */}
          <div 
            className="prose prose-sm md:prose-base lg:prose-lg prose-slate max-w-none
              bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8
              
              prose-headings:font-bold 
              prose-headings:text-gray-900
              prose-headings:mb-4
              prose-headings:mt-8
              prose-headings:tracking-tight
              
              prose-h2:text-2xl 
              prose-h2:md:text-3xl
              prose-h2:leading-tight
              prose-h2:border-b
              prose-h2:border-gray-100
              prose-h2:pb-2
              
              prose-h3:text-xl 
              prose-h3:md:text-2xl
              prose-h3:leading-tight
              prose-h3:mt-6
              
              prose-h4:text-lg
              prose-h4:md:text-xl
              prose-h4:leading-tight
              
              prose-p:text-base
              prose-p:md:text-lg
              prose-p:leading-relaxed
              prose-p:mb-6
              prose-p:text-gray-700
              
              prose-li:text-base
              prose-li:md:text-lg
              prose-li:mb-2
              prose-li:leading-relaxed
              prose-li:marker:text-primary
              
              prose-a:text-primary
              prose-a:font-medium
              prose-a:transition-colors
              prose-a:no-underline
              prose-a:border-b
              prose-a:border-primary/30
              prose-a:hover:border-primary
              
              prose-strong:font-bold
              prose-strong:text-gray-900
              
              prose-blockquote:border-l-4
              prose-blockquote:border-primary/20
              prose-blockquote:bg-gray-50
              prose-blockquote:rounded-r-lg
              prose-blockquote:pl-4
              prose-blockquote:py-2
              prose-blockquote:pr-4
              prose-blockquote:my-6
              prose-blockquote:italic
              prose-blockquote:text-gray-700
              
              prose-img:rounded-lg
              prose-img:shadow-md
              prose-img:my-8
              
              [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:leading-tight
              [&_h3]:text-xl [&_h3]:md:text-2xl [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:leading-tight
              
              [&_p]:mb-6 [&_p+p]:mt-6
              
              first-of-type:prose-p:text-lg first-of-type:prose-p:md:text-xl first-of-type:prose-p:leading-relaxed first-of-type:prose-p:text-gray-700 first-of-type:prose-p:font-medium"
            itemProp="reviewBody"
            dangerouslySetInnerHTML={{ __html: reviewContent }}
          />
          
          <meta itemProp="reviewRating" content="5" />
        </div>
      </Container>
    </section>
  )
} 