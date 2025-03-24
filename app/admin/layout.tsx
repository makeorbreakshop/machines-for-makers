import type React from "react"
import type { Metadata } from "next"
import { Sidebar } from "@/components/admin/sidebar"

export const metadata: Metadata = {
  title: "Admin Dashboard - Machines for Makers",
  description: "Admin dashboard for managing Machines for Makers content",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">{children}</div>
    </div>
  )
}

