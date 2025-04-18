"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { addDays, format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  DollarSign, 
  AlertTriangle,
  BarChart,
  Clock,
  Download,
  Settings,
  RefreshCw,
  X
} from "lucide-react"

// API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_PRICE_TRACKER_API_URL || 'http://localhost:8000'

// Chart colors
const CHART_COLORS = {
  haiku: "#22c55e",
  sonnet: "#3b82f6",
  gpt4: "#f97316",
  total: "#8b5cf6"
}

// Budget Alert Component
interface BudgetAlertProps {
  currentUsage: number;
  budget: number;
  threshold: number;
  onDismiss: () => void;
}

const BudgetAlert = ({ currentUsage, budget, threshold, onDismiss }: BudgetAlertProps) => {
  const percentUsed = (currentUsage / budget) * 100;
  
  if (percentUsed < threshold) return null;
  
  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 p-2 rounded-full">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-medium text-amber-900">Budget Alert</h3>
          <p className="text-sm text-amber-700">
            You've used {percentUsed.toFixed(1)}% of your monthly budget (${currentUsage.toFixed(2)} of ${budget})
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.scrollTo({ top: document.getElementById("budget-settings")?.offsetTop || 0, behavior: "smooth" })}>
          Adjust Budget
        </Button>
        <Button variant="ghost" size="icon" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default function CostTrackingPage() {
  // Date range state
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  })

  // Usage data state
  const [usageData, setUsageData] = useState<any>({
    summary: {
      total_cost: 0,
      total_tokens: 0,
      success_rate: 0,
      avg_response_time: 0
    },
    by_model: [],
    by_tier: [],
    trend: [],
    projections: {
      monthly_projected: 0,
      monthly_savings_potential: 0,
      estimated_end_month: 0
    },
    optimization_recommendations: []
  })

  // Budget settings state
  const [budgetSettings, setBudgetSettings] = useState({
    monthly_budget: 100,
    alert_threshold: 80,
    alerts_enabled: true
  })

  // Loading states
  const [loading, setLoading] = useState(true)
  const [savingBudget, setSavingBudget] = useState(false)
  const [realTimeUpdates, setRealTimeUpdates] = useState(false)

  // Budget alert state
  const [showBudgetAlert, setShowBudgetAlert] = useState(true)

  // Real-time update interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (realTimeUpdates) {
      // Set up polling every 30 seconds when real-time updates are enabled
      interval = setInterval(() => {
        fetchUsageData();
      }, 30000); // 30 seconds
      
      toast.info("Real-time updates enabled - refreshing every 30 seconds");
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [realTimeUpdates]);

  // Fetch usage data
  useEffect(() => {
    fetchUsageData()
  }, [dateRange])

  // Fetch budget settings
  useEffect(() => {
    const fetchBudgetSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/usage/budget`)

        if (!response.ok) {
          throw new Error(`Failed to fetch budget settings: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch budget settings')
        }

        setBudgetSettings(data.settings)
      } catch (error) {
        console.error("Error fetching budget settings:", error)
        toast.error("Failed to load budget settings")
      }
    }

    fetchBudgetSettings()
  }, [])

  // Handle budget settings save
  const handleSaveBudgetSettings = async () => {
    try {
      setSavingBudget(true)

      const response = await fetch(`${API_BASE_URL}/api/v1/usage/budget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(budgetSettings)
      })

      if (!response.ok) {
        throw new Error(`Failed to save budget settings: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save budget settings')
      }

      toast.success("Budget settings saved successfully")
    } catch (error) {
      console.error("Error saving budget settings:", error)
      toast.error("Failed to save budget settings")
    } finally {
      setSavingBudget(false)
    }
  }

  // Handle data export
  const handleExportData = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/usage/export?` +
        new URLSearchParams({
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: format(dateRange.to, 'yyyy-MM-dd')
        })
      )

      if (!response.ok) {
        throw new Error(`Failed to export data: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usage-data-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Data exported successfully")
    } catch (error) {
      console.error("Error exporting data:", error)
      toast.error("Failed to export data")
    }
  }

  // Extract fetchUsageData to be reusable
  const fetchUsageData = async () => {
    try {
      if (!realTimeUpdates) setLoading(true);
      
      // Fetch main usage data
      const response = await fetch(
        `${API_BASE_URL}/api/v1/usage/summary?` + 
        new URLSearchParams({
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: format(dateRange.to, 'yyyy-MM-dd')
        })
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch usage data: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch usage data')
      }
      
      // Fetch projections data
      const projectionsResponse = await fetch(
        `${API_BASE_URL}/api/v1/usage/projected?` + 
        new URLSearchParams({
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: format(dateRange.to, 'yyyy-MM-dd')
        })
      )
      
      if (projectionsResponse.ok) {
        const projectionsData = await projectionsResponse.json()
        
        if (projectionsData.success) {
          // Merge the projection data with the main usage data
          data.projections = projectionsData.projections
          data.optimization_recommendations = projectionsData.optimization_recommendations || []
        }
      }

      setUsageData(data)
    } catch (error) {
      console.error("Error fetching usage data:", error)
      if (!realTimeUpdates) toast.error("Failed to load usage data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Tracking Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor LLM usage, costs, and set budget alerts
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 mr-2">
            <Switch 
              id="real-time-updates"
              checked={realTimeUpdates}
              onCheckedChange={setRealTimeUpdates}
            />
            <Label htmlFor="real-time-updates" className="text-sm">Real-time Updates</Label>
          </div>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" id="budget-settings">
                <Settings className="w-4 h-4 mr-2" />
                Budget Settings
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Budget Settings</AlertDialogTitle>
                <AlertDialogDescription>
                  Configure monthly budget and alert thresholds
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly-budget">Monthly Budget (USD)</Label>
                  <Input
                    id="monthly-budget"
                    type="number"
                    min="0"
                    step="10"
                    value={budgetSettings.monthly_budget}
                    onChange={(e) => setBudgetSettings({
                      ...budgetSettings,
                      monthly_budget: parseInt(e.target.value)
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alert-threshold">Alert Threshold (%)</Label>
                  <Input
                    id="alert-threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={budgetSettings.alert_threshold}
                    onChange={(e) => setBudgetSettings({
                      ...budgetSettings,
                      alert_threshold: parseInt(e.target.value)
                    })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="alerts-enabled"
                    checked={budgetSettings.alerts_enabled}
                    onCheckedChange={(checked) => setBudgetSettings({
                      ...budgetSettings,
                      alerts_enabled: checked
                    })}
                  />
                  <Label htmlFor="alerts-enabled">Enable Budget Alerts</Label>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleSaveBudgetSettings}
                  disabled={savingBudget}
                >
                  {savingBudget && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Save Settings
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mb-6">
        <DatePickerWithRange
          date={dateRange}
          onDateChange={setDateRange}
        />
      </div>

      {/* Budget Alert */}
      {showBudgetAlert && 
        budgetSettings.alerts_enabled && 
        usageData.summary.total_cost > 0 &&
        ((usageData.summary.total_cost / budgetSettings.monthly_budget) * 100) >= budgetSettings.alert_threshold && (
        <BudgetAlert 
          currentUsage={usageData.summary.total_cost}
          budget={budgetSettings.monthly_budget}
          threshold={budgetSettings.alert_threshold}
          onDismiss={() => setShowBudgetAlert(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Cost
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${usageData.summary.total_cost.toFixed(2)}
                </div>
                <Progress 
                  value={(usageData.summary.total_cost / budgetSettings.monthly_budget) * 100} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {((usageData.summary.total_cost / budgetSettings.monthly_budget) * 100).toFixed(1)}% of monthly budget
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tokens
                </CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(usageData.summary.total_tokens / 1000).toFixed(1)}k
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Across all models
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(usageData.summary.success_rate * 100).toFixed(1)}%
                </div>
                <Progress 
                  value={usageData.summary.success_rate * 100}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Response Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageData.summary.avg_response_time?.toFixed(2)}s
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Average API response time
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Projections */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Projections</CardTitle>
              <CardDescription>
                Estimated monthly costs and potential savings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Monthly Projection</h3>
                  <p className="text-2xl font-bold">${usageData.projections?.monthly_projected?.toFixed(2) || "0.00"}</p>
                  <div className="flex items-center text-xs">
                    {usageData.projections?.monthly_projected > budgetSettings.monthly_budget ? (
                      <Badge variant="destructive" className="mr-2">Over Budget</Badge>
                    ) : (
                      <Badge variant="outline" className="mr-2">Within Budget</Badge>
                    )}
                    {((usageData.projections?.monthly_projected / budgetSettings.monthly_budget) * 100).toFixed(1)}% of budget
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Savings Potential</h3>
                  <p className="text-2xl font-bold">${usageData.projections?.monthly_savings_potential?.toFixed(2) || "0.00"}</p>
                  <p className="text-xs text-muted-foreground">Based on optimization suggestions</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Month-End Estimate</h3>
                  <p className="text-2xl font-bold">${usageData.projections?.estimated_end_month?.toFixed(2) || "0.00"}</p>
                  <Progress 
                    value={(usageData.projections?.estimated_end_month / budgetSettings.monthly_budget) * 100} 
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
              <CardDescription>
                Daily cost and token usage over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis yAxisId="cost" orientation="left" />
                    <YAxis yAxisId="tokens" orientation="right" />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      formatter={(value: any, name: string) => {
                        if (name === "Total Cost") return [`$${value.toFixed(2)}`, name]
                        return [value.toLocaleString(), name]
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="cost"
                      type="monotone"
                      dataKey="total_cost"
                      name="Total Cost"
                      stroke={CHART_COLORS.total}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="tokens"
                      type="monotone"
                      dataKey="total_tokens"
                      name="Total Tokens"
                      stroke={CHART_COLORS.haiku}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Usage by Model */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by Model</CardTitle>
                <CardDescription>
                  Cost breakdown by model type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usageData.by_model}
                        dataKey="cost"
                        nameKey="model"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.model}: $${entry.cost.toFixed(2)}`}
                      >
                        {usageData.by_model.map((entry: any, index: number) => (
                          <Cell 
                            key={entry.model} 
                            fill={CHART_COLORS[entry.model as keyof typeof CHART_COLORS] || `#${Math.floor(Math.random()*16777215).toString(16)}`}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => `$${value.toFixed(2)}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Usage by Tier */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by Tier</CardTitle>
                <CardDescription>
                  Cost breakdown by extraction tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Avg. Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageData.by_tier.map((tier: any) => (
                      <TableRow key={tier.tier}>
                        <TableCell className="font-medium">
                          {tier.tier}
                        </TableCell>
                        <TableCell>${tier.cost.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {(tier.success_rate * 100).toFixed(1)}%
                            <Progress 
                              value={tier.success_rate * 100}
                              className="w-20"
                            />
                          </div>
                        </TableCell>
                        <TableCell>{tier.avg_time.toFixed(2)}s</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
          {/* Optimization Recommendations */}
          {usageData.optimization_recommendations && usageData.optimization_recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Recommendations</CardTitle>
                <CardDescription>
                  Suggestions to reduce costs based on your usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageData.optimization_recommendations.map((recommendation: any, index: number) => (
                    <div key={index} className="flex gap-4 items-start border-b pb-4 last:border-0 last:pb-0">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{recommendation.title}</h3>
                        <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                        <div className="mt-2 flex items-center">
                          <Badge variant="outline" className="mr-2">Potential Savings: ${recommendation.potential_savings?.toFixed(2)}</Badge>
                          {recommendation.implementation_difficulty && (
                            <Badge 
                              variant={
                                recommendation.implementation_difficulty === 'easy' ? 'secondary' :
                                recommendation.implementation_difficulty === 'medium' ? 'default' : 'outline'
                              }
                            >
                              {recommendation.implementation_difficulty.charAt(0).toUpperCase() + recommendation.implementation_difficulty.slice(1)} to Implement
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Detailed Model Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Model & Tier Breakdown</CardTitle>
              <CardDescription>
                Comprehensive view of usage across models and tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="by-model" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="by-model">By Model</TabsTrigger>
                  <TabsTrigger value="by-tier">By Tier</TabsTrigger>
                  <TabsTrigger value="combined">Combined View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="by-model">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Average Cost/1K tokens</TableHead>
                        <TableHead>Success Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageData.by_model.map((model: any) => (
                        <TableRow key={model.model}>
                          <TableCell className="font-medium">{model.model}</TableCell>
                          <TableCell>${model.cost.toFixed(2)}</TableCell>
                          <TableCell>{(model.tokens / 1000).toFixed(1)}k</TableCell>
                          <TableCell>${model.tokens > 0 ? ((model.cost / model.tokens) * 1000).toFixed(3) : "0.000"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(model.success_rate * 100).toFixed(1)}%
                              <Progress value={model.success_rate * 100} className="w-20" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="by-tier">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Calls</TableHead>
                        <TableHead>Success Rate</TableHead>
                        <TableHead>Avg. Response Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageData.by_tier.map((tier: any) => (
                        <TableRow key={tier.tier}>
                          <TableCell className="font-medium">{tier.tier}</TableCell>
                          <TableCell>${tier.cost.toFixed(2)}</TableCell>
                          <TableCell>{(tier.tokens / 1000).toFixed(1)}k</TableCell>
                          <TableCell>{tier.calls}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(tier.success_rate * 100).toFixed(1)}%
                              <Progress value={tier.success_rate * 100} className="w-20" />
                            </div>
                          </TableCell>
                          <TableCell>{tier.avg_time.toFixed(2)}s</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="combined">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={usageData.trend}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                          formatter={(value: any, name: string) => {
                            if (name.includes("Cost")) return [`$${value.toFixed(2)}`, name]
                            return [value.toLocaleString(), name]
                          }}
                        />
                        <Legend />
                        {usageData.by_model.map((model: any) => (
                          <Line
                            key={`${model.model}_cost`}
                            type="monotone"
                            dataKey={`${model.model}_cost`}
                            name={`${model.model} Cost`}
                            stroke={CHART_COLORS[model.model as keyof typeof CHART_COLORS] || `#${Math.floor(Math.random()*16777215).toString(16)}`}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 