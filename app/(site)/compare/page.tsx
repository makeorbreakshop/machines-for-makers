import { Suspense } from "react"
import { createServerClient } from "@/lib/supabase/server"
import CompareClientPage from "./CompareClientPage"
import type { Database, Machine } from "@/lib/database-types"
import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { lazy } from "react"
import { dataProvider } from "@/lib/data-provider"

// Set config options directly, not re-exported
export const dynamic = 'auto'
export const revalidate = 3600 // Revalidate at most every hour

// Define metadata
export const metadata: Metadata = {
  title: "Compare Laser Cutters | Machines for Makers",
  description: "Compare laser cutters and engravers side by side. Filter by price, power, features and more.",
}

// Dynamically import heavy component with preloading hint
const DynamicComparisonTable = lazy(() => import('@/components/comparison-table'))

// Adapter function to convert from transformed dataProvider format back to the
// format expected by CompareClientPage component
function adaptDataProviderToCompareFormat(transformedData: any[]): Machine[] {
  // Find and debug the Genmitsu L8 machine
  const genmitsuL8 = transformedData.find(item => item.slug === "genmitsu-l8" || item.machine_name === "Genmitsu L8");
  if (genmitsuL8) {
    console.log("🔍 DEBUG GENMITSU L8 from dataProvider:", {
      name: genmitsuL8.machine_name,
      price: genmitsuL8.price,
      data: genmitsuL8,
    });
  }

  return transformedData.map(item => {
    // For Genmitsu L8, add extra debugging
    const isGenmitsu = item.slug === "genmitsu-l8" || item.machine_name === "Genmitsu L8";
    if (isGenmitsu) {
      console.log("🔍 DEBUG GENMITSU L8 transformation:", {
        beforePrice: item.price,
      });
    }

    const result = {
      id: item.id,
      "Machine Name": item.machine_name,
      "Internal link": item.slug,
      "Rating": item.rating,
      "Award": item.award,
      "Image": item.image_url,
      "Machine Category": item.machine_category,
      "Laser Category": item.laser_category,
      "Company": item.company,
      "Laser Type A": item.laser_type_a,
      "Laser Power A": item.laser_power_a,
      "Laser Type B": item.laser_type_b,
      "LaserPower B": item.laser_power_b,
      "Affiliate Link": item.affiliate_link,
      // Use the latest price from the data provider
      "Price": item.price,
      "Price Category": item.price_category,
      "Work Area": item.work_area,
      "Height": item.height,
      "Machine Size": item.machine_size,
      "Speed": item.speed,
      "Speed Category": item.speed_category,
      "Acceleration": item.acceleration,
      "Software": item.software,
      "Focus": item.focus,
      "Enclosure": item.enclosure,
      "Wifi": item.wifi,
      "Camera": item.camera,
      "Passthrough": item.passthrough,
      "Controller": item.controller,
      "Warranty": item.warranty,
      "Excerpt (Short)": item.excerpt_short,
      "Excerpt (Long)": item.excerpt_long,
      "Description": item.description,
      "Review": item.review,
      "Brandon's Take": item.brandonsTake,
      "Highlights": item.highlights,
      "Drawbacks": item.drawbacks,
      "YouTube Review": item.youtube_review,
      "Is A Featured Resource?": item.is_featured,
      "Favorited": item.favorited,
      "Hidden": item.hidden,
      "Laser Frequency": item.laser_frequency,
      "Pulse Width": item.pulse_width,
      "Best for:": item.best_for,
      "Laser Source Manufacturer": item.laser_source_manufacturer,
      "Created On": item.created_at,
      "Updated On": item.updated_at,
      "Published On": item.published_at
    } as Machine;
    
    // Extra debug for Genmitsu
    if (isGenmitsu) {
      console.log("🔍 DEBUG GENMITSU L8 after transformation:", {
        afterPrice: result["Price"],
      });
    }
    
    return result;
  });
}

export default async function ComparePage() {
  const supabase = await createServerClient()

  // Fetch data in parallel for better performance
  const [categoriesResponse, brandsResponse, productsResponse] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
    dataProvider.getMachines({ limit: 150 }) // Use dataProvider for correct pricing
  ])

  // Debug the raw response for Genmitsu L8
  const genmitsuInRawData = productsResponse.data?.find(m => 
    m.slug === "genmitsu-l8" || m.machine_name === "Genmitsu L8"
  );
  if (genmitsuInRawData) {
    console.log("🔍 DEBUG GENMITSU L8 RAW:", {
      found: true,
      price: genmitsuInRawData.price,
      machinesLatest: genmitsuInRawData.machines_latest,
    });
  } else {
    console.log("🔍 DEBUG GENMITSU L8 RAW: Not found in data from dataProvider");
  }

  // Adapt the data from dataProvider to format expected by CompareClientPage
  const adaptedProducts = adaptDataProviderToCompareFormat(productsResponse.data || []);

  // Find Genmitsu L8 in the adapted data to check its price
  const genmitsuInAdapted = adaptedProducts.find(m => 
    m["Internal link"] === "genmitsu-l8" || m["Machine Name"] === "Genmitsu L8"
  );
  if (genmitsuInAdapted) {
    console.log("🔍 DEBUG GENMITSU L8 ADAPTED:", {
      found: true,
      price: genmitsuInAdapted["Price"],
    });
  } else {
    console.log("🔍 DEBUG GENMITSU L8 ADAPTED: Not found in adapted data");
  }

  return (
    <div className="min-h-[800px]">
      <Suspense fallback={
        <div className="min-h-[800px] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded w-full max-w-4xl"></div>
          </div>
        </div>
      }>
        <CompareClientPage
          categories={categoriesResponse.data || []}
          brands={brandsResponse.data || []}
          initialProducts={adaptedProducts as Machine[]}
        />
      </Suspense>
    </div>
  )
}

