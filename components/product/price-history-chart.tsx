"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts'
import { format, subMonths } from 'date-fns'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface PriceHistoryChartProps {
  machineId: string
  currentPrice: number | null
  currency?: string
  compact?: boolean
}

interface PricePoint {
  date: string
  price: number
  isAllTimeLow?: boolean
  isAllTimeHigh?: boolean
}

export function PriceHistoryChart({ 
  machineId, 
  currentPrice,
  currency = 'USD',
  compact = false
}: PriceHistoryChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('6m') // Default to 6 months
  const [statsData, setStatsData] = useState({
    avgPrice: 0,
    minPrice: 0,
    maxPrice: 0,
    currentDiscount: 0,
  })
  
  // Load price history data
  useEffect(() => {
    async function fetchPriceHistory() {
      try {
        setLoading(true)
        
        // Calculate date range based on selected time range
        let fromDate
        switch (timeRange) {
          case '1m':
            fromDate = subMonths(new Date(), 1)
            break
          case '3m':
            fromDate = subMonths(new Date(), 3)
            break
          case '6m':
            fromDate = subMonths(new Date(), 6)
            break
          case '1y':
            fromDate = subMonths(new Date(), 12)
            break
          case 'all':
            fromDate = null
            break
          default:
            fromDate = subMonths(new Date(), 6)
        }
        
        // Fetch price history from Supabase
        let query = supabase
          .from('price_history')
          .select('*')
          .eq('machine_id', machineId)
          .order('date', { ascending: true })
        
        if (fromDate) {
          query = query.gte('date', fromDate.toISOString())
        }
        
        const { data, error } = await query
        
        if (error) {
          throw error
        }
        
        if (!data || data.length === 0) {
          // If no historical data, create a single point with current price
          const today = new Date().toISOString()
          setPriceHistory([{
            date: today,
            price: currentPrice ?? 0,
          }])
          setStatsData({
            avgPrice: currentPrice ?? 0,
            minPrice: currentPrice ?? 0,
            maxPrice: currentPrice ?? 0,
            currentDiscount: 0,
          })
        } else {
          // Format the data
          const formattedData: PricePoint[] = data.map(item => ({
            date: item.date,
            price: item.price,
            isAllTimeLow: item.is_all_time_low,
            isAllTimeHigh: item.is_all_time_high,
          }))
          
          // Calculate stats
          const prices = formattedData.map(item => item.price)
          const minPrice = Math.min(...prices)
          const maxPrice = Math.max(...prices)
          const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
          const currentDiscount = avgPrice > 0 ? (((avgPrice - (currentPrice ?? 0)) / avgPrice) * 100) : 0
          
          setStatsData({
            avgPrice,
            minPrice,
            maxPrice,
            currentDiscount,
          })
          
          setPriceHistory(formattedData)
        }
      } catch (err) {
        console.error('Error fetching price history:', err)
        setError('Failed to load price history data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchPriceHistory()
  }, [machineId, timeRange, currentPrice])
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy')
  }
  
  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>Loading price history data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>Error: {error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-md p-2 shadow-md">
          <p className="font-medium">{formatDate(data.date)}</p>
          <p className="text-primary">Price: {formatPrice(data.price)}</p>
          {data.isAllTimeLow && <p className="text-green-600 text-xs font-medium">All Time Low</p>}
          {data.isAllTimeHigh && <p className="text-red-500 text-xs font-medium">All Time High</p>}
        </div>
      )
    }
    return null
  }
  
  return compact ? (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          <button
            onClick={() => setTimeRange('1m')}
            className={`px-1.5 py-0.5 text-[10px] rounded ${timeRange === '1m' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            1M
          </button>
          <button
            onClick={() => setTimeRange('3m')}
            className={`px-1.5 py-0.5 text-[10px] rounded ${timeRange === '3m' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            3M
          </button>
          <button
            onClick={() => setTimeRange('6m')}
            className={`px-1.5 py-0.5 text-[10px] rounded ${timeRange === '6m' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            6M
          </button>
        </div>
        
        {statsData.currentDiscount > 5 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0.5">
            {statsData.currentDiscount.toFixed(0)}% below avg
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground">Current</p>
          <p className="text-xs font-medium">{formatPrice(currentPrice ?? 0)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Average</p>
          <p className="text-xs font-medium">{formatPrice(statsData.avgPrice)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Low</p>
          <p className="text-xs font-medium">{formatPrice(statsData.minPrice)}</p>
        </div>
      </div>
      
      <div className="h-[120px] w-full">
        <ChartContainer
          config={{
            price: {
              label: "Price",
              theme: {
                light: "#2563eb",
                dark: "#3b82f6",
              },
            },
          }}
        >
          <LineChart
            data={priceHistory}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(new Date(date), 'MMM d')}
              tick={{ fontSize: 9 }}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tickFormatter={(price) => formatPrice(price)}
              tick={{ fontSize: 9 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--theme-primary)"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
            {statsData.avgPrice > 0 && (
              <ReferenceLine 
                y={statsData.avgPrice} 
                stroke="rgba(107, 114, 128, 0.5)" 
                strokeDasharray="3 3" 
                label={{ 
                  value: 'Avg', 
                  position: 'right',
                  style: { fill: 'rgba(107, 114, 128, 0.8)', fontSize: 9 }
                }} 
              />
            )}
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  ) : (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Price History</CardTitle>
          <div className="flex gap-1">
            <button
              onClick={() => setTimeRange('1m')}
              className={`px-2 py-1 text-xs rounded ${timeRange === '1m' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              1M
            </button>
            <button
              onClick={() => setTimeRange('3m')}
              className={`px-2 py-1 text-xs rounded ${timeRange === '3m' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              3M
            </button>
            <button
              onClick={() => setTimeRange('6m')}
              className={`px-2 py-1 text-xs rounded ${timeRange === '6m' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              6M
            </button>
            <button
              onClick={() => setTimeRange('1y')}
              className={`px-2 py-1 text-xs rounded ${timeRange === '1y' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              1Y
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2 py-1 text-xs rounded ${timeRange === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              All
            </button>
          </div>
        </div>
        
        {statsData.currentDiscount > 5 && (
          <div className="mt-1">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {statsData.currentDiscount.toFixed(0)}% below average price
            </Badge>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="font-medium">{formatPrice(currentPrice ?? 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="font-medium">{formatPrice(statsData.avgPrice)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">All-Time Low</p>
            <p className="font-medium">{formatPrice(statsData.minPrice)}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-[200px] w-full">
          <ChartContainer
            config={{
              price: {
                label: "Price",
                theme: {
                  light: "#2563eb",
                  dark: "#3b82f6",
                },
              },
            }}
          >
            <LineChart
              data={priceHistory}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(price) => formatPrice(price)}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="var(--theme-primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              {statsData.avgPrice > 0 && (
                <ReferenceLine 
                  y={statsData.avgPrice} 
                  stroke="rgba(107, 114, 128, 0.5)" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: 'Avg', 
                    position: 'right',
                    style: { fill: 'rgba(107, 114, 128, 0.8)', fontSize: 10 }
                  }} 
                />
              )}
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
} 