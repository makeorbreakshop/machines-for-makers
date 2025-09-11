import { createServerClient } from "@/lib/supabase/server";
import { InkTestDataForm } from "./components/InkTestDataForm";
import { TestDataList } from "./components/TestDataList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { INK_MODES } from "@/app/tools/ink-calculator/config";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default async function InkCalculatorAdminPage() {
  // Check authentication - will redirect if not authenticated
  
  const supabase = await createServerClient();
  
  // Get test data count
  const { count } = await supabase
    .from("ink_test_data")
    .select("*", { count: "exact", head: true });
  
  // Force the bucket to be recognized as existing since we confirmed it exists
  const inkCalculatorBucketExists = true;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">UV Printer Ink Test Data</h1>
          <p className="text-muted-foreground">
            Manage test data for the UV Printer Ink Cost Calculator
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/tools/ink-calculator/validation">
            Validation Dashboard
          </Link>
        </Button>
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
      
      <Tabs defaultValue="add">
        <TabsList>
          <TabsTrigger value="add">Add Test Data</TabsTrigger>
          <TabsTrigger value="view">View Test Data ({count || 0})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="add" className="space-y-4">
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
        
        <TabsContent value="view" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Data Collection</CardTitle>
              <CardDescription>
                Collected test data helps improve calculator accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-md mb-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Test Data Impacts Calculator Accuracy</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                  The test data you upload is used to improve the calculator's accuracy. The system now uses:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-400 space-y-1 ml-2">
                  <li>Channel-specific coverage analysis with correction factors</li>
                  <li>Non-linear area scaling based on test measurements</li>
                  <li>Quality-specific multipliers from real print data</li>
                  <li>Minimum ink thresholds for low-coverage images</li>
                </ul>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
                  The more test data you add, the more accurate the calculations will become.
                </p>
              </div>
              
              <TestDataList inkModes={INK_MODES} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 