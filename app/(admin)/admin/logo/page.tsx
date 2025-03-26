import LogoUploader from "@/components/logo-uploader"
import { requireAdminAuth } from "@/lib/auth-utils"

export const metadata = {
  title: "Logo Management - Machines for Makers",
  description: "Upload and manage your site logo",
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default async function LogoManagementPage() {
  // Check authentication - will redirect if not authenticated
  await requireAdminAuth();
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Logo Management</h1>
        <p className="text-muted-foreground mb-8">
          Upload a new logo for your site. The logo will be stored in Supabase storage and automatically optimized when displayed.
        </p>
        
        <LogoUploader />
        
        <div className="mt-8 p-4 bg-muted/20 rounded-lg">
          <h2 className="font-semibold mb-2">Tips for best results:</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Use a transparent PNG for best results</li>
            <li>Recommended size: 300 × 80 pixels</li>
            <li>Keep file size under 200KB for faster loading</li>
            <li>Use a high contrast design that works on light backgrounds</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 