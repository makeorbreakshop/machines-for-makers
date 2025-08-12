import { Suspense } from "react"
import LaserPickerClient from "./LaserPickerClient"

export const metadata = {
  title: "Laser Picker Quiz - Find Your Perfect Laser Cutter | Machines for Makers",
  description: "Take our comprehensive 10-question quiz to find the perfect laser cutter for your specific needs and budget. Get personalized recommendations based on materials, projects, and workspace.",
}

export default function LaserPickerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LaserPickerClient />
    </Suspense>
  )
}