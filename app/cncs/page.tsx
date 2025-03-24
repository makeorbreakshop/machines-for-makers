import Breadcrumb from "@/components/breadcrumb"

export const metadata = {
  title: "CNC Machines - Machines for Makers",
  description:
    "Explore our comprehensive guide to CNC machines. Compare different types, read expert reviews, and find the perfect machine for your needs.",
}

export default function CNCsPage() {
  // Create breadcrumb items
  const breadcrumbItems = [{ label: "CNCs", href: "/cncs" }]

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-6">CNC Machines</h1>
        <div className="prose max-w-none">
          <p>
            Our CNC machine section is coming soon! We're working on comprehensive reviews, comparisons, and buying
            guides for all types of CNC machines.
          </p>
          <p>Check back soon for detailed information on desktop CNCs, routers, mills, and other CNC technologies.</p>
        </div>
      </div>

      <div className="bg-muted/20 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
        <p>
          We're currently testing and reviewing the latest CNC machines. Our detailed guides and comparisons will be
          available soon.
        </p>
      </div>
    </div>
  )
}

