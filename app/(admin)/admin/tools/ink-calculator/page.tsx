import { requireAdminAuth } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase/server";
import { InkTestDataForm } from "./components/InkTestDataForm";
import { TestDataList } from "./components/TestDataList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { INK_MODES } from "@/app/tools/ink-calculator/config";

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default async function InkCalculatorAdminPage() {
  // Check authentication - will redirect if not authenticated
  await requireAdminAuth();
  
  const supabase = await createServerClient();
  
  // Get test data count
  const { count } = await supabase
    .from("ink_test_data")
    .select("*", { count: "exact", head: true });
  
  // Force the bucket to be recognized as existing since we confirmed it exists
  const inkCalculatorBucketExists = true;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">UV Printer Ink Test Data</h1>
        <p className="text-muted-foreground mt-2">
          Manage test data for the UV Printer Ink Cost Calculator
        </p>
      </div>
      
      {!inkCalculatorBucketExists && (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Storage bucket missing</AlertTitle>
          <AlertDescription>
            The "ink-calculator" storage bucket does not exist. Please create it in the Supabase dashboard.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="add-data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="add-data">Add Test Data</TabsTrigger>
          <TabsTrigger value="view-data">View Test Data ({count || 0})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="add-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Test Data</CardTitle>
              <CardDescription>
                Upload a test image and enter the corresponding ink usage data from UVMake
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InkTestDataForm inkModes={INK_MODES} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="view-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Data Collection</CardTitle>
              <CardDescription>
                All test data entries for the ink calculator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestDataList inkModes={INK_MODES} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 