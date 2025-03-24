import Image from "next/image"
import Link from "next/link"
import Breadcrumb from "@/components/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Share,
  Printer,
  ArrowRight,
  Check,
  X,
  Star,
  Info,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Clock,
} from "lucide-react"

export const metadata = {
  title: "How to Choose a Laser Cutter - Buying Guide | Machines for Makers",
  description:
    "Learn how to choose the perfect laser cutter for your needs with our comprehensive buying guide covering types, specifications, and recommendations.",
}

export default function ChoosingLaserGuidePage() {
  // Create breadcrumb items
  const breadcrumbItems = [
    { label: "Buying Guides", href: "/guides" },
    { label: "Choosing a Laser Cutter", href: "/guides/choosing-a-laser" },
  ]

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <Breadcrumb items={breadcrumbItems} />

      {/* Header Section */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-primary hover:bg-primary">Featured</Badge>
          <Badge variant="outline">Updated March 2025</Badge>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">How to Choose a Laser Cutter</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl">
          A comprehensive guide to help you find the perfect laser cutter for your needs, budget, and workspace.
        </p>
      </div>

      {/* Author and Share Bar */}
      <Card className="mb-8">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-full overflow-hidden">
              <Image src="/placeholder.svg?height=40&width=40" alt="Author" fill className="object-cover" />
            </div>
            <div>
              <div className="font-medium">John Doe</div>
              <div className="text-xs text-muted-foreground">Laser Cutting Expert</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span>Published: January 15, 2025</span>
            <span className="hidden md:inline">•</span>
            <span className="block md:inline">Updated: March 10, 2025</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" /> Share
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Picks Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Our Top Picks</h2>
          <Button variant="link" size="sm" className="text-muted-foreground">
            <Info className="h-4 w-4 mr-1" /> How We Rate
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Pick 1 */}
          <Card className="overflow-hidden border-primary/50">
            <div className="bg-primary/10 p-3 border-b border-primary/20">
              <Badge className="bg-primary hover:bg-primary">Best Overall</Badge>
              <h3 className="font-bold text-lg mt-2">xTool P2</h3>
              <div className="flex items-center mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 text-amber-400 fill-amber-400" strokeWidth={1.5} />
                ))}
                <span className="text-sm ml-2">5.0</span>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="relative h-40 mb-4">
                <Image src="/placeholder.svg?height=160&width=300" alt="xTool P2" fill className="object-contain" />
              </div>
              <div className="mb-4">
                <div className="font-medium">Key Specs:</div>
                <ul className="text-sm space-y-1 mt-1">
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Laser Type:</span>
                    <span>CO2</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Power:</span>
                    <span>55W</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Work Area:</span>
                    <span>600 x 300 mm</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span>$4,999</span>
                  </li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="font-medium text-green-600 mb-1">Pros</div>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Powerful CO2 laser</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Built-in camera</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Air assist</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-red-600 mb-1">Cons</div>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-start">
                      <X className="h-4 w-4 text-red-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Expensive</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-4 w-4 text-red-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Large footprint</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="text-sm mb-4">
                <span className="font-medium">Why we picked it: </span>
                The xTool P2 offers the best combination of power, precision, and user-friendly features for most users.
              </div>
              <div className="flex gap-2">
                <Button className="w-full" asChild>
                  <Link href="/products/xtool-p2">View Details</Link>
                </Button>
                <Button variant="outline" className="flex-shrink-0" asChild>
                  <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Top Pick 2 */}
          <Card className="overflow-hidden">
            <div className="bg-muted/50 p-3 border-b">
              <Badge variant="secondary">Best Budget</Badge>
              <h3 className="font-bold text-lg mt-2">Atomstack X20 Pro</h3>
              <div className="flex items-center mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= 4 ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                    strokeWidth={1.5}
                  />
                ))}
                <span className="text-sm ml-2">4.0</span>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="relative h-40 mb-4">
                <Image
                  src="/placeholder.svg?height=160&width=300"
                  alt="Atomstack X20 Pro"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="mb-4">
                <div className="font-medium">Key Specs:</div>
                <ul className="text-sm space-y-1 mt-1">
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Laser Type:</span>
                    <span>Diode</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Power:</span>
                    <span>20W</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Work Area:</span>
                    <span>410 x 400 mm</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span>$699</span>
                  </li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="font-medium text-green-600 mb-1">Pros</div>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Affordable</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Large work area</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Good power</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-red-600 mb-1">Cons</div>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-start">
                      <X className="h-4 w-4 text-red-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>No enclosure</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-4 w-4 text-red-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Manual focus</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="text-sm mb-4">
                <span className="font-medium">Why we picked it: </span>
                The Atomstack X20 Pro offers excellent value for beginners and hobbyists on a budget.
              </div>
              <div className="flex gap-2">
                <Button className="w-full" asChild>
                  <Link href="/products/atomstack-x20-pro">View Details</Link>
                </Button>
                <Button variant="outline" className="flex-shrink-0" asChild>
                  <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Top Pick 3 */}
          <Card className="overflow-hidden">
            <div className="bg-muted/50 p-3 border-b">
              <Badge variant="secondary">Best for Professionals</Badge>
              <h3 className="font-bold text-lg mt-2">Thunder Nova 35</h3>
              <div className="flex items-center mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= 4.5 ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                    strokeWidth={1.5}
                  />
                ))}
                <span className="text-sm ml-2">4.5</span>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="relative h-40 mb-4">
                <Image
                  src="/placeholder.svg?height=160&width=300"
                  alt="Thunder Nova 35"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="mb-4">
                <div className="font-medium">Key Specs:</div>
                <ul className="text-sm space-y-1 mt-1">
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Laser Type:</span>
                    <span>CO2</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Power:</span>
                    <span>60W</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Work Area:</span>
                    <span>900 x 600 mm</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span>$10,350</span>
                  </li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="font-medium text-green-600 mb-1">Pros</div>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Professional quality</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Large work area</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Ruida controller</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-red-600 mb-1">Cons</div>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-start">
                      <X className="h-4 w-4 text-red-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Expensive</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-4 w-4 text-red-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Large footprint</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="text-sm mb-4">
                <span className="font-medium">Why we picked it: </span>
                The Thunder Nova 35 offers professional-grade performance and reliability for businesses and serious
                makers.
              </div>
              <div className="flex gap-2">
                <Button className="w-full" asChild>
                  <Link href="/products/thunder-nova-35">View Details</Link>
                </Button>
                <Button variant="outline" className="flex-shrink-0" asChild>
                  <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content and Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Mobile Table of Contents - only visible on mobile */}
        <div className="md:hidden mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Table of Contents</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                <li>
                  <a href="#introduction" className="text-primary hover:underline">
                    Introduction
                  </a>
                </li>
                <li>
                  <a href="#types-of-laser-cutters" className="text-primary hover:underline">
                    Types of Laser Cutters
                  </a>
                </li>
                <li>
                  <a href="#key-specifications" className="text-primary hover:underline">
                    Key Specifications
                  </a>
                </li>
                <li>
                  <a href="#price-ranges" className="text-primary hover:underline">
                    Price Ranges
                  </a>
                </li>
                <li>
                  <a href="#use-cases" className="text-primary hover:underline">
                    Use Cases
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-primary hover:underline">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#conclusion" className="text-primary hover:underline">
                    Conclusion
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Quick Comparison Table */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-6">Quick Comparison</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Laser Cutter</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Power</TableHead>
                    <TableHead>Work Area</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Best For</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-medium">xTool P2</TableCell>
                    <TableCell>CO2</TableCell>
                    <TableCell>55W</TableCell>
                    <TableCell>600 x 300 mm</TableCell>
                    <TableCell>$4,999</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium mr-1">5.0</span>
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      </div>
                    </TableCell>
                    <TableCell>Overall Best</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Atomstack X20 Pro</TableCell>
                    <TableCell>Diode</TableCell>
                    <TableCell>20W</TableCell>
                    <TableCell>410 x 400 mm</TableCell>
                    <TableCell>$699</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium mr-1">4.0</span>
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      </div>
                    </TableCell>
                    <TableCell>Budget Pick</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Thunder Nova 35</TableCell>
                    <TableCell>CO2</TableCell>
                    <TableCell>60W</TableCell>
                    <TableCell>900 x 600 mm</TableCell>
                    <TableCell>$10,350</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium mr-1">4.5</span>
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      </div>
                    </TableCell>
                    <TableCell>Professionals</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">xTool D1 Pro</TableCell>
                    <TableCell>Diode</TableCell>
                    <TableCell>10W</TableCell>
                    <TableCell>430 x 390 mm</TableCell>
                    <TableCell>$599</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium mr-1">4.2</span>
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      </div>
                    </TableCell>
                    <TableCell>Beginners</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Glowforge Pro</TableCell>
                    <TableCell>CO2</TableCell>
                    <TableCell>45W</TableCell>
                    <TableCell>495 x 279 mm</TableCell>
                    <TableCell>$5,995</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium mr-1">4.3</span>
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      </div>
                    </TableCell>
                    <TableCell>User-Friendly</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <Button variant="link" size="sm" className="p-0 h-auto">
                See all laser cutters we've tested
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="prose max-w-none">
            <h2 id="introduction">Introduction</h2>
            <p>
              Laser cutters and engravers have revolutionized the maker space, allowing for precise cutting and
              engraving on a variety of materials. Whether you're a hobbyist, small business owner, or professional,
              choosing the right laser cutter is crucial for your success.
            </p>
            <p>
              This guide will walk you through everything you need to know to make an informed decision, from
              understanding the different types of lasers to key specifications and features to consider.
            </p>

            <div className="not-prose bg-muted/20 p-4 rounded-lg my-8">
              <h3 className="text-lg font-bold mb-2">Key Takeaways</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    CO2 lasers are best for cutting thick materials, while diode lasers are more affordable for
                    beginners
                  </span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    Higher wattage means faster cutting and thicker materials, but comes with a higher price tag
                  </span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Consider your workspace, ventilation needs, and budget before making a purchase</span>
                </li>
              </ul>
            </div>

            <h2 id="types-of-laser-cutters">Types of Laser Cutters</h2>
            <p>There are several types of laser cutters available, each with its own strengths and ideal use cases:</p>

            <Tabs defaultValue="co2" className="w-full my-6 not-prose">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="co2">CO2 Lasers</TabsTrigger>
                <TabsTrigger value="diode">Diode Lasers</TabsTrigger>
                <TabsTrigger value="fiber">Fiber Lasers</TabsTrigger>
              </TabsList>
              <TabsContent value="co2" className="mt-4">
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3">
                        <div className="relative h-48 w-full">
                          <Image
                            src="/placeholder.svg?height=200&width=300"
                            alt="CO2 Laser"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <div className="md:w-2/3">
                        <p className="mb-4">
                          CO2 lasers use a gas-filled tube to generate the laser beam. They're versatile and can cut and
                          engrave a wide range of non-metal materials.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2 text-green-600">Pros</h4>
                            <ul className="space-y-1">
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Versatile for many materials
                              </li>
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Good for cutting thick
                                materials
                              </li>
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Widely available
                              </li>
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Higher cutting speed
                              </li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2 text-red-600">Cons</h4>
                            <ul className="space-y-1">
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Cannot cut metals
                              </li>
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Larger footprint
                              </li>
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Requires more maintenance
                              </li>
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Higher initial cost
                              </li>
                            </ul>
                          </div>
                        </div>
                        <Separator className="my-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Best For</h4>
                            <p className="text-sm">Wood, acrylic, leather, paper, fabric, glass (engraving only)</p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Price Range</h4>
                            <p className="text-sm">$2,000 - $30,000+</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="diode" className="mt-4">
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3">
                        <div className="relative h-48 w-full">
                          <Image
                            src="/placeholder.svg?height=200&width=300"
                            alt="Diode Laser"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <div className="md:w-2/3">
                        <p className="mb-4">
                          Diode lasers use semiconductor technology to generate the laser beam. They're more compact and
                          affordable than CO2 lasers.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2 text-green-600">Pros</h4>
                            <ul className="space-y-1">
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Compact and portable
                              </li>
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Affordable entry point
                              </li>
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Low maintenance
                              </li>
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Can engrave some metals
                              </li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2 text-red-600">Cons</h4>
                            <ul className="space-y-1">
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Less powerful
                              </li>
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Slower operation
                              </li>
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Limited cutting thickness
                              </li>
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Often open-frame design
                              </li>
                            </ul>
                          </div>
                        </div>
                        <Separator className="my-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Best For</h4>
                            <p className="text-sm">Thin wood, leather, paper, some plastics, light engraving</p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Price Range</h4>
                            <p className="text-sm">$200 - $3,000</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="fiber" className="mt-4">
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3">
                        <div className="relative h-48 w-full">
                          <Image
                            src="/placeholder.svg?height=200&width=300"
                            alt="Fiber Laser"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <div className="md:w-2/3">
                        <p className="mb-4">
                          Fiber lasers use optical fibers to generate and amplify the laser beam. They excel at marking
                          and engraving metals.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2 text-green-600">Pros</h4>
                            <ul className="space-y-1">
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Excellent for metals
                              </li>
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Long lifespan
                              </li>
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Low maintenance
                              </li>
                              <li className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" /> Very high precision
                              </li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2 text-red-600">Cons</h4>
                            <ul className="space-y-1">
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Limited cutting ability
                              </li>
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Higher cost
                              </li>
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Specialized use
                              </li>
                              <li className="flex items-start text-sm">
                                <span className="text-red-600 mr-2">✗</span> Not ideal for non-metals
                              </li>
                            </ul>
                          </div>
                        </div>
                        <Separator className="my-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Best For</h4>
                            <p className="text-sm">Metal marking and engraving, some plastics</p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Price Range</h4>
                            <p className="text-sm">$3,000 - $20,000+</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <h2 id="key-specifications">Key Specifications to Consider</h2>

            <Accordion type="single" collapsible className="not-prose mb-8">
              <AccordionItem value="power">
                <AccordionTrigger className="text-lg font-medium">Power (Wattage)</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-4">
                    The power of a laser cutter, measured in watts, determines how quickly it can cut and how thick of
                    material it can handle.
                  </p>
                  <div className="space-y-4">
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Low power (5-40W)</h4>
                      <p className="text-sm">Suitable for engraving and cutting thin materials</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Medium power (40-80W)</h4>
                      <p className="text-sm">Good balance for most hobbyists and small businesses</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">High power (80W+)</h4>
                      <p className="text-sm">Professional-grade for thick materials and high volume</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="work-area">
                <AccordionTrigger className="text-lg font-medium">Work Area</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-4">
                    The work area determines the maximum size of material you can process. Consider the typical size of
                    your projects when choosing a machine.
                  </p>
                  <div className="space-y-4">
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Small (300x200mm)</h4>
                      <p className="text-sm">Compact desktop machines for small projects</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Medium (600x400mm)</h4>
                      <p className="text-sm">Standard size for most hobbyists and small businesses</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Large (900x600mm+)</h4>
                      <p className="text-sm">Professional machines for larger projects</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="speed">
                <AccordionTrigger className="text-lg font-medium">Speed and Acceleration</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-4">
                    Speed affects how quickly the laser can move across the material, while acceleration determines how
                    quickly it can change direction.
                  </p>
                  <p>
                    Higher speeds and accelerations result in faster job completion, which is important for production
                    environments.
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Standard (400-600mm/s)</h4>
                      <p className="text-sm">Suitable for hobbyists and occasional use</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">High-speed (600-1000mm/s)</h4>
                      <p className="text-sm">Good for small businesses with regular production</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Ultra-fast (1000mm/s+)</h4>
                      <p className="text-sm">Professional-grade for high-volume production</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="features">
                <AccordionTrigger className="text-lg font-medium">Additional Features</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-4">
                    Modern laser cutters come with various features that can significantly improve usability and
                    performance:
                  </p>
                  <div className="space-y-4">
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Autofocus</h4>
                      <p className="text-sm">Automatically adjusts the focal distance for optimal cutting/engraving</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Camera System</h4>
                      <p className="text-sm">Allows for precise positioning and material preview</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Air Assist</h4>
                      <p className="text-sm">Blows away smoke and debris for cleaner cuts</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">Pass-through Slot</h4>
                      <p className="text-sm">Allows for processing materials longer than the work area</p>
                    </div>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">WiFi Connectivity</h4>
                      <p className="text-sm">Enables wireless operation without a direct computer connection</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <h2 id="price-ranges">Price Ranges</h2>
            <p>
              Laser cutters come in a wide range of prices, from budget-friendly options to professional-grade machines:
            </p>

            <div className="not-prose my-6">
              <div className="space-y-4">
                <div className="bg-muted/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Entry-level</h3>
                    <span className="font-bold">$200-$1,000</span>
                  </div>
                  <p className="text-sm mb-2">Basic diode lasers for hobbyists</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Atomstack X20 Pro</Badge>
                    <Badge variant="outline">xTool D1 Pro</Badge>
                    <Badge variant="outline">Ortur Laser Master 3</Badge>
                  </div>
                </div>

                <div className="bg-muted/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Mid-range</h3>
                    <span className="font-bold">$1,000-$5,000</span>
                  </div>
                  <p className="text-sm mb-2">Better diode lasers and entry-level CO2 lasers</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">xTool P2</Badge>
                    <Badge variant="outline">Flux Beamo</Badge>
                    <Badge variant="outline">OMTech K40</Badge>
                  </div>
                </div>

                <div className="bg-muted/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Professional</h3>
                    <span className="font-bold">$5,000-$15,000</span>
                  </div>
                  <p className="text-sm mb-2">Quality CO2 and fiber lasers for small businesses</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Glowforge Pro</Badge>
                    <Badge variant="outline">Thunder Nova 35</Badge>
                    <Badge variant="outline">Epilog Zing</Badge>
                  </div>
                </div>

                <div className="bg-muted/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Industrial</h3>
                    <span className="font-bold">$15,000+</span>
                  </div>
                  <p className="text-sm mb-2">High-power, high-speed machines for production environments</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Trotec Speedy 400</Badge>
                    <Badge variant="outline">Epilog Fusion Pro</Badge>
                    <Badge variant="outline">Universal VLS</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="not-prose bg-primary/5 p-6 rounded-lg my-8 border border-primary/20">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Info className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Expert Tip</h3>
                  <p className="text-sm mb-2">
                    When considering price, remember to factor in additional costs beyond the machine itself:
                  </p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-start">
                      <ChevronRight className="h-4 w-4 text-primary mr-1 mt-0.5 flex-shrink-0" />
                      <span>Ventilation system ($200-$1,000)</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="h-4 w-4 text-primary mr-1 mt-0.5 flex-shrink-0" />
                      <span>Air assist pump ($50-$300)</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="h-4 w-4 text-primary mr-1 mt-0.5 flex-shrink-0" />
                      <span>Software licenses (e.g., LightBurn: $60-$120)</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="h-4 w-4 text-primary mr-1 mt-0.5 flex-shrink-0" />
                      <span>Maintenance supplies and replacement parts</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <h2 id="use-cases">Use Cases</h2>
            <p>Different laser cutters are better suited for different applications:</p>

            <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Hobbyist</h3>
                  <p className="text-sm mb-3">A 40W CO2 laser or 10W diode laser is usually sufficient</p>
                  <div className="text-sm space-y-1">
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Craft projects and personalized items</span>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Occasional use with varied materials</span>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Budget-friendly options work well</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Small Business</h3>
                  <p className="text-sm mb-3">Consider a 60-80W CO2 laser for versatility and speed</p>
                  <div className="text-sm space-y-1">
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Regular production of products for sale</span>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Consistent material types and thicknesses</span>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Reliability and speed are important</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Production</h3>
                  <p className="text-sm mb-3">80W+ CO2 or fiber laser with large work area and high speed</p>
                  <div className="text-sm space-y-1">
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>High-volume manufacturing</span>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Cutting thick materials consistently</span>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Maximum uptime and reliability needed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Metal Marking</h3>
                  <p className="text-sm mb-3">Fiber laser or MOPA laser for detailed metal engraving</p>
                  <div className="text-sm space-y-1">
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Industrial marking and serialization</span>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>Jewelry and metal product customization</span>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                      <span>High precision and contrast needed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <h2 id="faq">Frequently Asked Questions</h2>
            <div className="not-prose space-y-4 my-6">
              <Accordion type="single" collapsible>
                <AccordionItem value="ventilation">
                  <AccordionTrigger className="text-base font-medium">
                    Do I need ventilation for a laser cutter?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      Yes, all laser cutters produce fumes and smoke that need to be properly ventilated. CO2 lasers
                      typically require more robust ventilation than diode lasers, but all should be vented outside or
                      through a filtration system.
                    </p>
                    <p className="mb-2">There are three main ventilation options:</p>
                    <ol className="space-y-2 mb-2">
                      <li className="flex items-start">
                        <span className="font-medium mr-2">1.</span>
                        <span>
                          <span className="font-medium">Direct venting outside:</span> The most effective method, using
                          ducting to expel fumes directly outdoors.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium mr-2">2.</span>
                        <span>
                          <span className="font-medium">Filtration systems:</span> These use activated carbon and HEPA
                          filters to clean the air before recirculating it.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium mr-2">3.</span>
                        <span>
                          <span className="font-medium">Window fans:</span> A budget option for occasional use with
                          diode lasers, but not recommended for regular use.
                        </span>
                      </li>
                    </ol>
                    <p>
                      For safety, never operate a laser cutter without proper ventilation, as the fumes can be harmful.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cut-metal">
                  <AccordionTrigger className="text-base font-medium">Can laser cutters cut metal?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      Fiber lasers can cut thin metals, and high-power CO2 lasers can cut very thin non-reflective
                      metals with the right setup. Diode lasers generally cannot cut metal but can sometimes mark it.
                      For serious metal cutting, a dedicated metal-cutting laser or other tool like a plasma cutter is
                      recommended.
                    </p>
                    <p className="mb-2">Here's what different laser types can do with metals:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="font-medium mr-2">•</span>
                        <span>
                          <span className="font-medium">Fiber lasers:</span> Can cut thin metals (up to 5mm depending on
                          power) and engrave most metals with high precision.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium mr-2">•</span>
                        <span>
                          <span className="font-medium">CO2 lasers:</span> Can cut very thin (0.5mm or less)
                          non-reflective metals like anodized aluminum with high power (100W+), but this isn't their
                          strength.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium mr-2">•</span>
                        <span>
                          <span className="font-medium">Diode lasers:</span> Generally cannot cut metal, but some
                          higher-power models can mark certain metals with the help of marking compounds.
                        </span>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="software">
                  <AccordionTrigger className="text-base font-medium">
                    What software do I need for a laser cutter?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      Most laser cutters come with their own software, but many users prefer third-party options like
                      LightBurn, which offers more features and better usability. Design work is typically done in
                      software like Adobe Illustrator, Inkscape, or CorelDRAW before being sent to the laser software.
                    </p>
                    <p className="mb-2">The software workflow typically involves:</p>
                    <ol className="space-y-2 mb-2">
                      <li className="flex items-start">
                        <span className="font-medium mr-2">1.</span>
                        <span>
                          <span className="font-medium">Design software:</span> For creating or preparing your designs
                          (Illustrator, Inkscape, CorelDRAW)
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium mr-2">2.</span>
                        <span>
                          <span className="font-medium">Laser control software:</span> For sending designs to the laser
                          and controlling cutting/engraving parameters
                        </span>
                      </li>
                    </ol>
                    <p>
                      LightBurn ($60-$120) is highly recommended for most users as it works with many different laser
                      types and offers powerful features while remaining user-friendly.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <h2 id="conclusion">Conclusion</h2>
            <p>
              Choosing the right laser cutter involves balancing your needs, budget, and workspace constraints. By
              understanding the different types, key specifications, and use cases, you can make an informed decision
              that will serve you well for years to come.
            </p>
            <p>
              Remember to also consider factors like safety features, software compatibility, and available support when
              making your final decision.
            </p>

            <div className="not-prose mt-8">
              <div className="flex items-center justify-between">
                <div className="text-sm">Was this guide helpful?</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <ThumbsUp className="h-4 w-4 mr-2" /> Yes
                  </Button>
                  <Button variant="outline" size="sm">
                    <ThumbsDown className="h-4 w-4 mr-2" /> No
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden md:block md:col-span-1">
          <div className="sticky top-8">
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle>Table of Contents</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                  <ul className="space-y-2">
                    <li>
                      <a href="#introduction" className="text-primary hover:underline">
                        Introduction
                      </a>
                    </li>
                    <li>
                      <a href="#types-of-laser-cutters" className="text-primary hover:underline">
                        Types of Laser Cutters
                      </a>
                    </li>
                    <li>
                      <a href="#key-specifications" className="text-primary hover:underline">
                        Key Specifications
                      </a>
                      <ul className="pl-4 mt-1 space-y-1">
                        <li>
                          <a href="#power" className="text-muted-foreground hover:text-primary hover:underline text-sm">
                            Power (Wattage)
                          </a>
                        </li>
                        <li>
                          <a
                            href="#work-area"
                            className="text-muted-foreground hover:text-primary hover:underline text-sm"
                          >
                            Work Area
                          </a>
                        </li>
                        <li>
                          <a href="#speed" className="text-muted-foreground hover:text-primary hover:underline text-sm">
                            Speed and Acceleration
                          </a>
                        </li>
                        <li>
                          <a
                            href="#features"
                            className="text-muted-foreground hover:text-primary hover:underline text-sm"
                          >
                            Additional Features
                          </a>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <a href="#price-ranges" className="text-primary hover:underline">
                        Price Ranges
                      </a>
                    </li>
                    <li>
                      <a href="#use-cases" className="text-primary hover:underline">
                        Use Cases
                      </a>
                    </li>
                    <li>
                      <a href="#faq" className="text-primary hover:underline">
                        FAQ
                      </a>
                    </li>
                    <li>
                      <a href="#conclusion" className="text-primary hover:underline">
                        Conclusion
                      </a>
                    </li>
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle>Machine Finder</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Not sure which laser cutter is right for you? Answer a few questions and we'll recommend the perfect
                  machine.
                </p>
                <Button className="w-full" asChild>
                  <Link href="/tools/machine-finder">Start Machine Finder Quiz</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle>Related Guides</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  <li>
                    <Link href="/guides/co2-vs-diode" className="text-primary hover:underline flex items-center">
                      CO2 vs. Diode Lasers: Which to Choose?
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/guides/budget-laser-cutters"
                      className="text-primary hover:underline flex items-center"
                    >
                      Best Budget Laser Cutters in 2025
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/guides/category-comparisons"
                      className="text-primary hover:underline flex items-center"
                    >
                      Laser vs. CNC vs. 3D Printer
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle>Top Rated Lasers</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0">
                    <Image src="/placeholder.svg?height=64&width=64" alt="xTool P2" fill className="object-contain" />
                  </div>
                  <div>
                    <Link href="/products/xtool-p2" className="font-medium hover:text-primary hover:underline">
                      xTool P2
                    </Link>
                    <div className="flex items-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" strokeWidth={1.5} />
                      ))}
                      <span className="text-xs ml-1">5.0</span>
                    </div>
                    <div className="text-sm font-medium mt-1">$4,999</div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0">
                    <Image
                      src="/placeholder.svg?height=64&width=64"
                      alt="Thunder Nova 35"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <Link href="/products/thunder-nova-35" className="font-medium hover:text-primary hover:underline">
                      Thunder Nova 35
                    </Link>
                    <div className="flex items-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${star <= 4.5 ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                          strokeWidth={1.5}
                        />
                      ))}
                      <span className="text-xs ml-1">4.5</span>
                    </div>
                    <div className="text-sm font-medium mt-1">$10,350</div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0">
                    <Image
                      src="/placeholder.svg?height=64&width=64"
                      alt="Atomstack X20 Pro"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <Link href="/products/atomstack-x20-pro" className="font-medium hover:text-primary hover:underline">
                      Atomstack X20 Pro
                    </Link>
                    <div className="flex items-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${star <= 4 ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                          strokeWidth={1.5}
                        />
                      ))}
                      <span className="text-xs ml-1">4.0</span>
                    </div>
                    <div className="text-sm font-medium mt-1">$699</div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                    <Link href="/compare">View all laser cutters</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Newsletter</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Get the latest buying guides, reviews, and maker tips delivered to your inbox.
                </p>
                <div className="space-y-2">
                  <input type="email" placeholder="Your email address" className="w-full px-3 py-2 rounded-md border" />
                  <Button className="w-full">Subscribe</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

