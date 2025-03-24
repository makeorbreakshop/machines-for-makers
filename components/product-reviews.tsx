"use client"

import type { Review } from "@/lib/database-types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ProductReviewsProps {
  reviews: Review[]
}

export default function ProductReviews({ reviews }: ProductReviewsProps) {
  const [visibleReviews, setVisibleReviews] = useState(3)

  const showMoreReviews = () => {
    setVisibleReviews((prev) => prev + 3)
  }

  return (
    <div className="space-y-6">
      {reviews.slice(0, visibleReviews).map((review) => (
        <Card key={review.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>{getInitials(review.author || "Anonymous")}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{review.author || "Anonymous"}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex">
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${
                        index < Math.floor(review.rating || 0)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {review.title && <h4 className="font-semibold mb-2">{review.title}</h4>}
            <div className="text-sm">
              {review.content && <div dangerouslySetInnerHTML={{ __html: review.content }} />}
            </div>

            {(review.pros?.length || review.cons?.length) && (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {review.pros?.length ? (
                  <div>
                    <h5 className="text-sm font-medium text-green-600 mb-1">Pros</h5>
                    <ul className="text-sm space-y-1">
                      {review.pros.map((pro, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-600 mr-2">✓</span> {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {review.cons?.length ? (
                  <div>
                    <h5 className="text-sm font-medium text-red-600 mb-1">Cons</h5>
                    <ul className="text-sm space-y-1">
                      {review.cons.map((con, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-red-600 mr-2">✗</span> {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {visibleReviews < reviews.length && (
        <div className="text-center">
          <Button variant="outline" onClick={showMoreReviews}>
            Show More Reviews
          </Button>
        </div>
      )}
    </div>
  )
}

// Helper function to get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)
}

