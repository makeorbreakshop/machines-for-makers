import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Login - Machines for Makers",
  description: "Login to the Machines for Makers admin dashboard",
}

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 