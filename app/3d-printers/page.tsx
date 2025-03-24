import Breadcrumb from "@/components/breadcrumb"

export const metadata = {
  title: "3D Printers - Machines for Makers",
  description:
    "Explore our comprehensive guide to 3D printers. Compare different types, read expert reviews, and find the perfect machine for your needs.",
}

export default function ThreeDPrintersPage() {
  // Create breadcrumb items
  const breadcrumbItems = [{ label: "3D Printers", href: "/3d-printers" }]

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-6">3D Printers</h1>
        <div className="prose max-w-none">
          <p>
            Our 3D printer section is coming soon! We're working on comprehensive reviews, comparisons, and buying
            guides for all types of 3D printers.
          </p>
          <p>Check back soon for detailed information on FDM, SLA, MSLA, and other 3D printing technologies.</p>
        </div>
      </div>

      <div className="bg-muted/20 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
        <p>
          We're currently testing and reviewing the latest 3D printers. Our detailed guides and comparisons will be
          available soon.
        </p>
      </div>
    </div>
  )
}

