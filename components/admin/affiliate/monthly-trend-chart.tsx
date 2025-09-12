'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

interface MonthlyTrendData {
  month: string;
  [programId: string]: string | number;
}

interface ProgramInfo {
  id: string;
  name: string;
  brand_name: string;
  commission_rate: number;
  color: string;
  selected: boolean;
  totalSales: number;
  totalCommission: number;
  totalOrders: number;
  isTotal?: boolean;
}

interface SalesDataType {
  sales?: Array<{
    order_date?: string;
    program_id?: string;
    total_sales?: number;
    commission_amount?: number;
  }>;
  program_stats?: Array<{
    program_id: string;
    program_name: string;
    brand_name: string;
    commission_rate: number;
    total_sales: number;
    total_commission: number;
    order_count: number;
  }>;
}

interface MonthlyTrendChartProps {
  salesData: SalesDataType | null;
  selectedProgram: string;
  selectedDateRange: string;
}

// Chart color palette
const CHART_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', 
  '#c2410c', '#0891b2', '#be185d', '#7c3aed', '#059669'
];

export function MonthlyTrendChart({ salesData }: MonthlyTrendChartProps) {
  const [chartData, setChartData] = useState<MonthlyTrendData[]>([]);
  const [programInfos, setProgramInfos] = useState<ProgramInfo[]>([]);
  const [metricType, setMetricType] = useState<'sales' | 'commission' | 'orders'>('sales');

  useEffect(() => {
    const prepareChartData = () => {
    if (!salesData?.sales || !Array.isArray(salesData.sales)) {
      setChartData([]);
      setProgramInfos([]);
      return;
    }

    // Group sales by month and program
    const monthlyProgramData = new Map<string, Map<string, { sales: number; commission: number; orders: number }>>();
    const programsMap = new Map<string, { name: string; brand_name: string; commission_rate: number }>();

    salesData.sales.forEach((sale) => {
      if (!sale.order_date || !sale.program_id) return;

      const date = new Date(sale.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyProgramData.has(monthKey)) {
        monthlyProgramData.set(monthKey, new Map());
      }
      
      const monthData = monthlyProgramData.get(monthKey)!;
      
      if (!monthData.has(sale.program_id)) {
        monthData.set(sale.program_id, { sales: 0, commission: 0, orders: 0 });
      }
      
      const programData = monthData.get(sale.program_id)!;
      programData.sales += sale.total_sales || 0;
      programData.commission += sale.commission_amount || 0;
      programData.orders += 1;

      // Store program info
      if (!programsMap.has(sale.program_id)) {
        const programStats = salesData.program_stats?.find((p) => p.program_id === sale.program_id);
        programsMap.set(sale.program_id, {
          name: programStats?.program_name || 'Unknown Program',
          brand_name: programStats?.brand_name || 'Unknown',
          commission_rate: programStats?.commission_rate || 0
        });
      }
    });

    // Convert to chart data format
    const months = Array.from(monthlyProgramData.keys()).sort();
    const programs = Array.from(programsMap.keys());

    const chartDataArray: MonthlyTrendData[] = months.map(month => {
      const monthData = monthlyProgramData.get(month)!;
      const dataPoint: MonthlyTrendData = { month };

      let totalSales = 0;
      let totalCommission = 0;
      let totalOrders = 0;

      programs.forEach(programId => {
        const programData = monthData.get(programId) || { sales: 0, commission: 0, orders: 0 };
        
        dataPoint[`${programId}_sales`] = programData.sales;
        dataPoint[`${programId}_commission`] = programData.commission;
        dataPoint[`${programId}_orders`] = programData.orders;

        totalSales += programData.sales;
        totalCommission += programData.commission;
        totalOrders += programData.orders;
      });

      dataPoint['total_sales'] = totalSales;
      dataPoint['total_commission'] = totalCommission;
      dataPoint['total_orders'] = totalOrders;

      return dataPoint;
    });

    // Create program info array with colors and selection state
    const programInfoArray: ProgramInfo[] = programs.map((programId, index) => {
      const program = programsMap.get(programId)!;
      const programStats = salesData.program_stats?.find((p) => p.program_id === programId);
      
      return {
        id: programId,
        name: program.name,
        brand_name: program.brand_name,
        commission_rate: program.commission_rate,
        color: CHART_COLORS[(index + 1) % CHART_COLORS.length],
        selected: false,
        totalSales: programStats?.total_sales || 0,
        totalCommission: programStats?.total_commission || 0,
        totalOrders: programStats?.order_count || 0,
        isTotal: false
      };
    });

    // Sort by total sales
    programInfoArray.sort((a, b) => b.totalSales - a.totalSales);

    // Add total row
    const totalSales = programInfoArray.reduce((sum, p) => sum + p.totalSales, 0);
    const totalCommission = programInfoArray.reduce((sum, p) => sum + p.totalCommission, 0);
    const totalOrders = programInfoArray.reduce((sum, p) => sum + p.totalOrders, 0);

    const totalInfo: ProgramInfo = {
      id: 'total',
      name: 'Total (All Programs)',
      brand_name: '',
      commission_rate: 0,
      color: CHART_COLORS[0],
      selected: true, // Default to showing total
      totalSales,
      totalCommission,
      totalOrders,
      isTotal: true
    };

      setChartData(chartDataArray);
      setProgramInfos([totalInfo, ...programInfoArray]);
    };

    if (salesData) {
      prepareChartData();
    }
  }, [salesData, metricType]);

  const toggleProgramSelection = (programId: string) => {
    setProgramInfos(prev => {
      const currentProgram = prev.find(p => p.id === programId);
      
      if (programId === 'total') {
        if (currentProgram?.selected) {
          // Deselecting total - select top 4 individual programs
          return prev.map((program, index) => ({
            ...program,
            selected: !program.isTotal && index <= 4 && index > 0
          }));
        } else {
          // Selecting total - deselect all individual programs
          return prev.map(program => ({
            ...program,
            selected: program.id === 'total'
          }));
        }
      } else {
        // Toggle individual program and deselect total
        return prev.map(program => {
          if (program.id === programId) {
            return { ...program, selected: !program.selected };
          } else if (program.isTotal) {
            return { ...program, selected: false };
          } else {
            return program;
          }
        });
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMM yyyy');
  };

  const selectedPrograms = programInfos.filter(p => p.selected);
  const hasData = chartData.length > 0 && selectedPrograms.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Monthly {metricType === 'sales' ? 'Sales' : metricType === 'commission' ? 'Commission' : 'Orders'} Trend
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={metricType === 'sales' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMetricType('sales')}
              className="text-xs"
            >
              Sales
            </Button>
            <Button
              variant={metricType === 'commission' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMetricType('commission')}
              className="text-xs"
            >
              Commission
            </Button>
            <Button
              variant={metricType === 'orders' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMetricType('orders')}
              className="text-xs"
            >
              Orders
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            {chartData.length === 0 ? 'No data available' : 'Select programs to display'}
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="h-80 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData} 
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    tickFormatter={(value) => {
                      if (metricType === 'orders') return value.toString();
                      return formatCurrency(value);
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                    labelFormatter={(value) => formatMonth(value as string)}
                    formatter={(value: number, name: string) => {
                      if (name === 'total_sales' || name === 'total_commission' || name === 'total_orders') {
                        const label = 'Total (All Programs)';
                        if (metricType === 'orders') {
                          return [value, label];
                        }
                        return [formatCurrency(value), label];
                      }
                      
                      // Handle individual programs
                      const programId = name.replace(`_${metricType}`, '');
                      const program = programInfos.find(p => p.id === programId);
                      const label = program ? `${program.name} (${program.brand_name})` : programId;
                      
                      if (metricType === 'orders') {
                        return [value, label];
                      }
                      return [formatCurrency(value), label];
                    }}
                  />
                  {selectedPrograms.map((program) => {
                    const dataKey = program.isTotal 
                      ? `total_${metricType}` 
                      : `${program.id}_${metricType}`;
                    
                    return (
                      <Line
                        key={program.id}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={program.color}
                        strokeWidth={program.isTotal ? 3 : 2}
                        dot={false}
                        activeDot={{ r: program.isTotal ? 5 : 4, fill: program.color }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Program Selection Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 border-b px-4 py-3">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <div className="w-10"></div>
                  <div className="flex-1">Program</div>
                  <div className="w-20 text-right">Orders</div>
                  <div className="w-24 text-right">Total Sales</div>
                  <div className="w-24 text-right">Commission</div>
                  <div className="w-20 text-right">Rate</div>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {programInfos.map((program) => (
                  <div 
                    key={program.id}
                    className={`flex items-center px-4 py-3 hover:bg-muted/30 border-b last:border-b-0 ${
                      program.selected ? 'bg-muted/20' : ''
                    }`}
                  >
                    <div className="w-10">
                      <Checkbox
                        checked={program.selected}
                        onCheckedChange={() => toggleProgramSelection(program.id)}
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: program.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{program.name}</div>
                        {program.brand_name && (
                          <div className="text-xs text-muted-foreground truncate">
                            {program.brand_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm font-medium">
                      {program.totalOrders.toLocaleString()}
                    </div>
                    <div className="w-24 text-right text-sm font-medium">
                      {formatCurrency(program.totalSales)}
                    </div>
                    <div className="w-24 text-right text-sm font-medium">
                      {formatCurrency(program.totalCommission)}
                    </div>
                    <div className="w-20 text-right text-xs">
                      {program.isTotal ? '-' : `${(program.commission_rate * 100).toFixed(1)}%`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground text-center">
              {selectedPrograms.length} of {programInfos.length} programs selected
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}