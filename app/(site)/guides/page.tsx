import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Cpu, PrinterIcon as Printer3d, Scissors } from "lucide-react"
import Breadcrumb from "@/components/breadcrumb"

export const metadata = {
  title: "Buying Guides - Machines for Makers",
  description:
    "Comprehensive buying guides to help you choose the perfect laser cutter, 3D printer, or CNC machine for your needs.",
}

export default function BuyingGuidesPage() {
  // Create breadcrumb items
  const breadcrumbItems = [{ label: "Buying Guides", href: "/guides" }]

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">Buying Guides</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl">
          Our comprehensive buying guides will help you navigate the complex world of maker machines and find the
          perfect tool for your needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-2">
              <Scissors className="h-5 w-5 text-primary" />
              <CardTitle>How to Choose a Laser Cutter</CardTitle>
            </div>
            <CardDescription>
              Learn about the different types of laser cutters, key specifications to consider, and find the perfect
              laser for your projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
              <li>• Compare CO2, diode, and fiber laser technologies</li>
              <li>• Understand key specifications and features</li>
              <li>• Find the right machine for your budget</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/guides/choosing-a-laser">
                Read Guide <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-2">
              <Printer3d className="h-5 w-5 text-primary" />
              <CardTitle>How to Choose a 3D Printer</CardTitle>
            </div>
            <CardDescription>
              Compare FDM vs. resin technologies, understand key features, and find the perfect 3D printer for your
              needs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
              <li>• FDM vs. resin printing technologies compared</li>
              <li>• Key specifications explained in plain language</li>
              <li>• Best printers for different applications</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/guides/choosing-a-3d-printer">
                Read Guide <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-5 w-5 text-primary" />
              <CardTitle>How to Choose a CNC Machine</CardTitle>
            </div>
            <CardDescription>
              Understand the different types of CNC machines, important specifications, and which one is right for your
              workshop.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
              <li>• CNC routers vs. mills vs. lathes explained</li>
              <li>• Material compatibility and limitations</li>
              <li>• Space and power requirements</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/guides/choosing-a-cnc">
                Read Guide <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle>Laser vs. CNC vs. 3D Printer</CardTitle>
            </div>
            <CardDescription>
              Not sure which technology is right for your projects? This guide compares the capabilities, pros, and cons
              of each.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
              <li>• Direct comparison of all three technologies</li>
              <li>• Best use cases for each machine type</li>
              <li>• Combining technologies for optimal results</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/guides/category-comparisons">
                Read Guide <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="bg-muted/20 p-4 md:p-6 rounded-lg mb-12">
        <h2 className="text-xl md:text-2xl font-bold mb-4">How Our Guides Can Help</h2>
        <p className="mb-4">
          Choosing the right machine for your needs can be overwhelming with so many options available. Our buying
          guides:
        </p>
        <ul className="space-y-2 mb-4">
          <li className="flex items-start">
            <span className="text-primary mr-2">✓</span> Break down complex technical specifications into
            easy-to-understand terms
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">✓</span> Compare different machine types and price ranges
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">✓</span> Provide honest assessments of pros and cons
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">✓</span> Recommend specific models based on different use cases
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">✓</span> Answer common questions to help you make an informed decision
          </li>
        </ul>
      </div>

      <div className="mb-12">
        <h2 className="text-xl md:text-2xl font-bold mb-6">Latest Guides & Updates</h2>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <span className="text-xs text-muted-foreground">Updated 2 weeks ago</span>
              <h3 className="font-bold text-lg mt-1">Best Budget Laser Cutters in 2025</h3>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
                Our updated guide to the best laser cutters under $1,000 with new models and recommendations.
              </p>
              <Button variant="link" className="px-0 mt-2" asChild>
                <Link href="/guides/budget-laser-cutters">Read More</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <span className="text-xs text-muted-foreground">Updated 1 month ago</span>
              <h3 className="font-bold text-lg mt-1">Resin vs. FDM 3D Printers: Which Should You Choose?</h3>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
                A detailed comparison of the two main 3D printing technologies to help you decide which is right for
                you.
              </p>
              <Button variant="link" className="px-0 mt-2" asChild>
                <Link href="/guides/resin-vs-fdm">Read More</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <span className="text-xs text-muted-foreground">Updated 2 months ago</span>
              <h3 className="font-bold text-lg mt-1">Desktop CNC Machines for Small Workshops</h3>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
                Find the perfect compact CNC machine that won't take up your entire workspace.
              </p>
              <Button variant="link" className="px-0 mt-2" asChild>
                <Link href="/guides/desktop-cnc-machines">Read More</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

