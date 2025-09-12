"use client";

import { useState, useEffect, useCallback } from 'react';
import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Package,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SalesData {
  sales: any[];
  aggregates: {
    total_sales: number;
    total_commission: number;
    total_orders: number;
    average_order_value: number;
  };
  machine_stats: any[];
  program_stats: any[];
  monthly_stats: any[];
}

export default function AffiliateDashboard() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [programs, setPrograms] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [updatingMachine, setUpdatingMachine] = useState(false);
  const { toast } = useToast();

  // Load programs and machines
  useEffect(() => {
    fetchPrograms();
    fetchMachines();
  }, []);

  // Load sales data
  useEffect(() => {
    fetchSalesData();
  }, [selectedProgram, selectedDateRange]);

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/admin/affiliate/programs');
      const data = await response.json();
      setPrograms(data.programs || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/admin/machines');
      const data = await response.json();
      setMachines(data.machines || []);
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (selectedProgram !== 'all') {
        params.append('program_id', selectedProgram);
      }
      
      // Add date range filters
      const now = new Date();
      if (selectedDateRange === '30days') {
        const startDate = new Date(now.setDate(now.getDate() - 30));
        params.append('start_date', startDate.toISOString().split('T')[0]);
      } else if (selectedDateRange === '90days') {
        const startDate = new Date(now.setDate(now.getDate() - 90));
        params.append('start_date', startDate.toISOString().split('T')[0]);
      } else if (selectedDateRange === 'year') {
        const startDate = new Date(now.getFullYear(), 0, 1);
        params.append('start_date', startDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/admin/affiliate/sales?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setSalesData(data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch sales data',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch sales data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const handleMachineSelect = (saleId: string) => {
    setSelectedSaleId(saleId);
    setMachineSearchQuery('');
    setMachineModalOpen(true);
  };

  const updateSaleMachine = async (machineId: string) => {
    if (!selectedSaleId) return;
    
    setUpdatingMachine(true);
    try {
      const response = await fetch('/api/admin/affiliate/sales/update-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_id: selectedSaleId,
          machine_id: machineId
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Machine assignment updated',
        });
        setMachineModalOpen(false);
        fetchSalesData(); // Refresh data
      } else {
        throw new Error('Failed to update machine');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update machine assignment',
        variant: 'destructive'
      });
    } finally {
      setUpdatingMachine(false);
    }
  };

  const filteredMachines = machines.filter(machine => 
    machine['Machine Name']?.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
    machine.Company?.toLowerCase().includes(machineSearchQuery.toLowerCase())
  );

  return (
    <AdminPageWrapper title="Affiliate Sales Dashboard">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex gap-4">
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map(program => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={fetchSalesData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatCurrency(salesData?.aggregates.total_sales || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                From affiliate sales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatCurrency(salesData?.aggregates.total_commission || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Earned commission
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : salesData?.aggregates.total_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Completed orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatCurrency(salesData?.aggregates.average_order_value || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per transaction
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="machines" className="space-y-4">
          <TabsList>
            <TabsTrigger value="machines">By Machine</TabsTrigger>
            <TabsTrigger value="programs">By Program</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
            <TabsTrigger value="recent">Recent Sales</TabsTrigger>
          </TabsList>

          {/* Machine Performance */}
          <TabsContent value="machines">
            <Card>
              <CardHeader>
                <CardTitle>Machine Performance</CardTitle>
                <CardDescription>
                  Sales breakdown by machine model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Avg Sale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : salesData?.machine_stats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No data available</TableCell>
                      </TableRow>
                    ) : (
                      salesData?.machine_stats.map((stat) => (
                        <TableRow key={stat.machine_id}>
                          <TableCell className="font-medium">{stat.machine_name}</TableCell>
                          <TableCell className="text-right">{stat.order_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stat.total_sales)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stat.total_commission)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(stat.total_sales / stat.order_count)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Program Performance */}
          <TabsContent value="programs">
            <Card>
              <CardHeader>
                <CardTitle>Program Performance</CardTitle>
                <CardDescription>
                  Sales breakdown by affiliate program
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : salesData?.program_stats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No data available</TableCell>
                      </TableRow>
                    ) : (
                      salesData?.program_stats.map((stat) => (
                        <TableRow key={stat.program_id}>
                          <TableCell className="font-medium">{stat.program_name}</TableCell>
                          <TableCell>{stat.brand_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {formatPercent(stat.commission_rate)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{stat.order_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stat.total_sales)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stat.total_commission)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Trend */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trend</CardTitle>
                <CardDescription>
                  Sales performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : salesData?.monthly_stats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No data available</TableCell>
                      </TableRow>
                    ) : (
                      salesData?.monthly_stats.map((stat) => (
                        <TableRow key={stat.month}>
                          <TableCell className="font-medium">{stat.month}</TableCell>
                          <TableCell className="text-right">{stat.order_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stat.total_sales)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stat.total_commission)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(stat.total_sales / stat.order_count)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Sales */}
          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  Latest affiliate transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead className="text-right">Sale Amount</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : salesData?.sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">No sales data available</TableCell>
                      </TableRow>
                    ) : (
                      salesData?.sales.slice(0, 10).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            {new Date(sale.order_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {sale.order_number}
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={sale.raw_product_string}>
                            {sale.raw_product_string}
                          </TableCell>
                          <TableCell>
                            {sale.machine_name ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 justify-start font-normal"
                                onClick={() => handleMachineSelect(sale.id)}
                              >
                                {sale.machine_name}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 text-muted-foreground hover:text-foreground"
                                onClick={() => handleMachineSelect(sale.id)}
                              >
                                <Search className="h-3 w-3 mr-1" />
                                Select Machine
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(sale.total_sales)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(sale.commission_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={sale.status === 'approved' ? 'default' : 'secondary'}
                            >
                              {sale.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Machine Selection Modal */}
        <Dialog open={machineModalOpen} onOpenChange={setMachineModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Machine</DialogTitle>
              <DialogDescription>
                Choose the correct machine for this sale
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search machines..."
                  value={machineSearchQuery}
                  onChange={(e) => setMachineSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {filteredMachines.slice(0, 50).map((machine) => (
                    <Button
                      key={machine.id}
                      variant="outline"
                      className="w-full justify-start text-left"
                      onClick={() => updateSaleMachine(machine.id)}
                      disabled={updatingMachine}
                    >
                      <div>
                        <div className="font-medium">{machine['Machine Name']}</div>
                        <div className="text-sm text-muted-foreground">
                          {machine.Company} - ${machine.Price}
                        </div>
                      </div>
                    </Button>
                  ))}
                  {filteredMachines.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No machines found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageWrapper>
  );
}