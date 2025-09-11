import DashboardClient from "./dashboard-client";

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  // Authentication is handled by middleware
  // No need for server-side auth check here as middleware blocks unauthenticated requests
  
  return <DashboardClient />;
}