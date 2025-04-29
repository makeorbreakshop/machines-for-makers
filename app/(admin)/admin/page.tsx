import { requireAdminAuth } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase/server";
import { Layers, Tag, Star, Building, Calculator } from "lucide-react";
import Link from "next/link";

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Check authentication - will redirect if not authenticated
  await requireAdminAuth();
  
  const supabase = await createServerClient();

  // Get counts for dashboard
  const [machinesCount, brandsCount, categoriesCount, reviewsCount] = await Promise.all([
    supabase.from("machines").select("id", { count: "exact" }).then(r => r.count || 0),
    supabase.from("brands").select("id", { count: "exact" }).then(r => r.count || 0),
    supabase.from("categories").select("id", { count: "exact" }).then(r => r.count || 0),
    supabase.from("reviews").select("id", { count: "exact" }).then(r => r.count || 0),
  ]);
  
  // Get ink test data count - handle case where table might not exist yet
  let inkTestDataCount = 0;
  try {
    const { count } = await supabase
      .from("ink_test_data")
      .select("id", { count: "exact", head: true });
    
    inkTestDataCount = count || 0;
  } catch (error) {
    console.error("Error fetching ink test data count:", error);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400">
        Welcome to the Machines for Makers admin dashboard.
      </p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/machines" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Machines</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{machinesCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage product listings
          </p>
        </Link>
        <Link href="/admin/machines?tab=brands" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Brands</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{brandsCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage brands
          </p>
        </Link>
        <Link href="/admin/machines?tab=categories" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Categories</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{categoriesCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage product categories
          </p>
        </Link>
        <Link href="/admin/machines?tab=reviews" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Reviews</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{reviewsCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage product reviews
          </p>
        </Link>
      </div>
      
      <h2 className="text-xl font-bold tracking-tight mt-6">Tools</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/tools/ink-calculator" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <h3 className="text-lg font-semibold">UV Ink Calculator</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{inkTestDataCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage UV printer test data
          </p>
        </Link>
      </div>
    </div>
  );
}

