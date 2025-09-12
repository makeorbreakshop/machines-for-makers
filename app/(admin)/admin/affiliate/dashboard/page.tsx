"use client";

import React, { useState, useEffect } from 'react';
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
  Download,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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
import { MonthlyTrendChart } from '@/components/admin/affiliate/monthly-trend-chart';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 20;
  const { toast } = useToast();

  // Load programs and machines
  useEffect(() => {
    fetchPrograms();
    fetchMachines();
  }, []);

  // Load sales data
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
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

  const updateSaleMachine = async (machineId: string | null) => {
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
        // Update the local state instead of refetching everything
        if (salesData) {
          const updatedSales = salesData.sales.map(sale => {
            if (sale.id === selectedSaleId) {
              // Find the machine details if a machine was selected
              const selectedMachine = machineId ? 
                machines.find(m => m.id === machineId) : null;
              
              return {
                ...sale,
                machine_id: machineId,
                machine_name: selectedMachine ? selectedMachine['Machine Name'] : null,
                product_match_confidence: machineId === null ? 0 : 1
              };
            }
            return sale;
          });
          
          // Update the salesData with the modified sales array
          setSalesData({
            ...salesData,
            sales: updatedSales
          });
          
          // Also update machine_stats if needed
          if (machineId) {
            const selectedMachine = machines.find(m => m.id === machineId);
            if (selectedMachine) {
              // Update or add to machine_stats
              const existingStatIndex = salesData.machine_stats.findIndex(
                stat => stat.machine_id === machineId
              );
              
              if (existingStatIndex >= 0) {
                // Update existing stat
                const updatedStats = [...salesData.machine_stats];
                const sale = salesData.sales.find(s => s.id === selectedSaleId);
                if (sale) {
                  updatedStats[existingStatIndex] = {
                    ...updatedStats[existingStatIndex],
                    total_sales: updatedStats[existingStatIndex].total_sales + (sale.total_sales || 0),
                    total_commission: updatedStats[existingStatIndex].total_commission + (sale.commission_amount || 0),
                    order_count: updatedStats[existingStatIndex].order_count + 1
                  };
                }
              }
            }
          }
        }
        
        toast({
          title: 'Success',
          description: machineId === null ? 
            'Marked as not a machine' : 
            'Machine assignment updated',
        });
        setMachineModalOpen(false);
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

  // Sort sales data
  const sortedSales = React.useMemo(() => {
    if (!salesData?.sales) return [];
    
    return [...salesData.sales].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];
      
      // Handle special cases
      if (sortColumn === 'machine') {
        aValue = a.machine_name || (a.product_match_confidence === 0 ? 'Not a Machine' : '');
        bValue = b.machine_name || (b.product_match_confidence === 0 ? 'Not a Machine' : '');
      } else if (sortColumn === 'product') {
        aValue = a.raw_product_string || '';
        bValue = b.raw_product_string || '';
      } else if (sortColumn === 'sale_amount') {
        aValue = a.total_sales || 0;
        bValue = b.total_sales || 0;
      } else if (sortColumn === 'commission') {
        aValue = a.commission_amount || 0;
        bValue = b.commission_amount || 0;
      }
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Compare values
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [salesData?.sales, sortColumn, sortDirection]);

  // Handle column header click
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // Set new column with descending order
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'desc' ? 
      <ArrowDown className="ml-2 h-4 w-4" /> : 
      <ArrowUp className="ml-2 h-4 w-4" />;
  };

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
            {loading ? (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trend</CardTitle>
                  <CardDescription>
                    Sales performance over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Loading chart data...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MonthlyTrendChart 
                salesData={salesData}
                selectedProgram={selectedProgram}
                selectedDateRange={selectedDateRange}
              />
            )}
          </TabsContent>

          {/* Recent Sales */}
          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  Latest affiliate transactions
                  {salesData?.sales && salesData.sales.length > 0 && (
                    <span className="ml-2 text-sm">
                      ({salesData.sales.length} total)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('order_date')}
                      >
                        <div className="flex items-center">
                          Date
                          {getSortIcon('order_date')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('order_number')}
                      >
                        <div className="flex items-center">
                          Order #
                          {getSortIcon('order_number')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('product')}
                      >
                        <div className="flex items-center">
                          Product
                          {getSortIcon('product')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('machine')}
                      >
                        <div className="flex items-center">
                          Machine
                          {getSortIcon('machine')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort('sale_amount')}
                      >
                        <div className="flex items-center justify-end">
                          Sale Amount
                          {getSortIcon('sale_amount')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort('commission')}
                      >
                        <div className="flex items-center justify-end">
                          Commission
                          {getSortIcon('commission')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : sortedSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">No sales data available</TableCell>
                      </TableRow>
                    ) : (
                      sortedSales
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((sale) => (
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
                            ) : sale.product_match_confidence === 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 text-muted-foreground hover:text-foreground"
                                onClick={() => handleMachineSelect(sale.id)}
                              >
                                <span className="opacity-60">Not a Machine</span>
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
                
                {/* Pagination Controls */}
                {sortedSales.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, sortedSales.length)} of{' '}
                      {sortedSales.length} sales
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.ceil(sortedSales.length / itemsPerPage) },
                          (_, i) => i + 1
                        ).filter(page => {
                          // Show first page, last page, current page, and pages around current
                          const totalPages = Math.ceil(sortedSales.length / itemsPerPage);
                          return page === 1 || 
                                 page === totalPages || 
                                 Math.abs(page - currentPage) <= 1;
                        }).map((page, index, arr) => (
                          <React.Fragment key={page}>
                            {index > 0 && arr[index - 1] !== page - 1 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-8 w-8 p-0"
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => 
                          Math.min(Math.ceil(sortedSales.length / itemsPerPage), prev + 1)
                        )}
                        disabled={currentPage === Math.ceil(sortedSales.length / itemsPerPage)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
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
                  {/* Not a Machine Option */}
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left border-dashed border-2"
                    onClick={() => updateSaleMachine(null)}
                    disabled={updatingMachine}
                  >
                    <div>
                      <div className="font-medium">❌ Not a Machine</div>
                      <div className="text-sm text-muted-foreground">
                        This is an accessory, material, service, or other non-machine item
                      </div>
                    </div>
                  </Button>
                  
                  {/* Separator */}
                  {filteredMachines.length > 0 && (
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Machines</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Machine Options */}
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
                  {filteredMachines.length === 0 && machineSearchQuery && (
                    <div className="text-center text-muted-foreground py-8">
                      No machines found matching "{machineSearchQuery}"
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