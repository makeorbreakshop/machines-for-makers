"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Code, FileText, Image, Info } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DebugPanelProps {
  debugData: {
    claude: {
      data: any;
      error: string | null;
      rawResponse: {
        prompt: {
          system: string;
          user: string;
        };
        response: any;
      } | null;
    };
    webScraper: any;
  };
}

export function DebugPanel({ debugData }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Check if we have valid debug data
  if (!debugData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Debug Data Missing</AlertTitle>
        <AlertDescription>
          No debug data available. Make sure debug mode is enabled in the API request.
        </AlertDescription>
      </Alert>
    )
  }

  const { claude, webScraper } = debugData

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full rounded-md border p-2 mt-4"
    >
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="flex gap-2 items-center w-full justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>Debug Information</span>
          </div>
          <span>{isOpen ? "Hide" : "Show"}</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <Tabs defaultValue="claude" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="claude">Claude AI</TabsTrigger>
            <TabsTrigger value="webscraper">Web Scraper</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="claude" className="space-y-4">
            {claude.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Claude Error</AlertTitle>
                <AlertDescription>
                  {claude.error}
                </AlertDescription>
              </Alert>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  System Prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {claude.rawResponse?.prompt.system || "No system prompt available"}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  User Prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {claude.rawResponse?.prompt.user || "No user prompt available"}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Raw Claude Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(claude.rawResponse?.response, null, 2) || "No response available"}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Parsed Claude Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(claude.data, null, 2) || "No data available"}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="webscraper" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Web Scraper Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  {webScraper.image_url && (
                    <div className="rounded-md overflow-hidden border w-full max-w-xs mx-auto mb-4">
                      <img 
                        src={webScraper.image_url} 
                        alt="Extracted product image" 
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                </div>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(webScraper, null, 2) || "No web scraper data available"}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Data Source Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-md font-semibold mb-2">Claude AI</h3>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(claude.data, null, 2) || "No Claude data"}
                      </pre>
                    </ScrollArea>
                  </div>
                  <div>
                    <h3 className="text-md font-semibold mb-2">Web Scraper</h3>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(webScraper, null, 2) || "No web scraper data"}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  )
} 