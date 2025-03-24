import { createServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { MachineForm } from "@/components/admin/machine-form"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default async function EditMachinePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createServerClient()

  // If id is "new", we're creating a new machine
  if (params.id === "new") {
    // Get categories and brands for the form
    const [categoriesResponse, brandsResponse] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("brands").select("*").order("name"),
    ])

    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Add New Machine</h1>
        <MachineForm categories={categoriesResponse.data || []} brands={brandsResponse.data || []} />
      </div>
    )
  }

  // Otherwise, we're editing an existing machine
  const { data: machine, error } = await supabase.from("machines").select("*").eq("id", params.id).single()

  if (error || !machine) {
    notFound()
  }

  // Get categories and brands for the form
  const [categoriesResponse, brandsResponse] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
  ])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Edit Machine: {machine.machine_name}</h1>
      <MachineForm machine={machine} categories={categoriesResponse.data || []} brands={brandsResponse.data || []} />
    </div>
  )
}

