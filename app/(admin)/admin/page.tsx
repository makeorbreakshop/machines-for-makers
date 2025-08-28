import { requireAdminAuth } from "@/lib/auth-utils";
import DashboardClient from "./dashboard-client";

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Check authentication
  await requireAdminAuth();
  
  return <DashboardClient />;
}