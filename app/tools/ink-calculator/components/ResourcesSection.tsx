"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Youtube } from "lucide-react";

interface ResourcesSectionProps {
  youtubeLink: string;
  affiliateLink: string;
}

export default function ResourcesSection({
  youtubeLink,
  affiliateLink,
}: ResourcesSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">EufyMake Resources</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex gap-3">
        <Button 
          variant="default" 
          className="flex-1"
          onClick={() => window.open(youtubeLink, '_blank')}
        >
          <Youtube className="mr-2 h-4 w-4" />
          Watch Review
        </Button>
        
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => window.open(affiliateLink, '_blank')}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Shop Now
        </Button>
      </CardContent>
    </Card>
  );
} 