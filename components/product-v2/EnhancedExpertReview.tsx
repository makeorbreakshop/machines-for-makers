"use client"

import { cn } from "@/lib/utils"

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
  // Log everything we receive to debug
  console.log("EnhancedExpertReview Debug:", { 
    hasReview: !!review, 
    reviewType: typeof review,
    reviewLength: review?.length || 0,
    reviewExcerpt: review?.substring(0, 100),
    hasBrandonsTake: !!brandonsTake
  });
  
  // Use review if available, otherwise fallback to Brandon's Take
  const reviewContent = review || brandonsTake;
  
  // Don't render if absolutely no content
  if (!reviewContent) {
    console.warn("No review content available to display");
    return null;
  }
  
  return (
    <section 
      className={cn(
        "",
        className
      )} 
      itemProp="review" 
      itemScope 
      itemType="https://schema.org/Review"
    >
      <div 
        id="enhanced-review-content"
        className="prose prose-sm md:prose-base lg:prose-lg prose-slate max-w-none
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
          prose-h2:pb-3
          
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
          prose-blockquote:border-primary/30
          prose-blockquote:bg-gray-50
          prose-blockquote:rounded-r-lg
          prose-blockquote:pl-5
          prose-blockquote:py-2
          prose-blockquote:pr-4
          prose-blockquote:my-6
          prose-blockquote:italic
          prose-blockquote:text-gray-700
          
          prose-img:rounded-lg
          prose-img:shadow-md
          prose-img:my-8
          prose-img:mx-auto
          prose-img:max-w-full
          prose-img:h-auto
          prose-img:object-contain
          prose-img:max-h-[500px]
          prose-img:border
          prose-img:border-gray-100
          
          prose-figure:my-8
          prose-figure:mx-auto
          prose-figure:max-w-full
          
          [&_figure]:block [&_figure]:my-12 [&_figure]:mx-auto [&_figure]:max-w-full
          
          [&_figure.w-richtext-figure-type-image]:block [&_figure.w-richtext-figure-type-image]:my-12 [&_figure.w-richtext-figure-type-image]:mx-auto 
          [&_figure.w-richtext-figure-type-image]:max-w-full [&_figure.w-richtext-figure-type-image]:overflow-hidden
          
          [&_figure.w-richtext-align-fullwidth]:w-full
          
          [&_figure > div]:flex [&_figure > div]:justify-center [&_figure > div]:items-center [&_figure > div]:w-full
          [&_figure img]:block [&_figure img]:mx-auto [&_figure img]:max-w-full [&_figure img]:max-h-[600px] [&_figure img]:h-auto [&_figure img]:rounded-lg [&_figure img]:shadow-md [&_figure img]:object-cover
          
          [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:leading-tight
          [&_h3]:text-xl [&_h3]:md:text-2xl [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:leading-tight
          
          [&_p]:mb-6 [&_p+p]:mt-6
          
          first-of-type:prose-p:text-lg first-of-type:prose-p:md:text-xl first-of-type:prose-p:leading-relaxed first-of-type:prose-p:text-gray-700 first-of-type:prose-p:font-medium"
        itemProp="reviewBody"
        dangerouslySetInnerHTML={{ __html: reviewContent }}
      />
      
      <meta itemProp="reviewRating" content="5" />
    </section>
  )
} 