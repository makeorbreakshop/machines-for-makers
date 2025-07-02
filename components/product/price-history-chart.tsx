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
  currentPrice: number
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
  const [hasLimitedData, setHasLimitedData] = useState(false)
  
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
        
        // Fetch price history from Supabase - only approved/applied prices
        let query = supabase
          .from('price_history')
          .select('*')
          .eq('machine_id', machineId)
          .in('status', ['AUTO_APPLIED', 'APPROVED', 'SUCCESS']) // Only show approved prices
          .order('date', { ascending: true })
        
        if (fromDate) {
          query = query.gte('date', fromDate.toISOString())
        }
        
        const { data, error } = await query
        
        if (error) {
          throw error
        }
        
        // Debug logging
        console.log('Price history data for machine:', machineId)
        console.log('Raw data from Supabase:', data)
        console.log('Data length:', data?.length)
        
        if (!data || data.length === 0) {
          // If no historical data, create data points for the last 30 days to show a trend
          const dataPoints = []
          const today = new Date()
          for (let i = 29; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)
            dataPoints.push({
              date: date.toISOString(),
              price: Number(currentPrice),
            })
          }
          setPriceHistory(dataPoints)
          setStatsData({
            avgPrice: currentPrice,
            minPrice: currentPrice,
            maxPrice: currentPrice,
            currentDiscount: 0,
          })
          setHasLimitedData(true)
        } else {
          // Group data by date to handle multiple prices per day
          const groupedByDate = data.reduce((acc, item) => {
            const dateStr = new Date(item.date).toDateString()
            if (!acc[dateStr] || new Date(item.date) > new Date(acc[dateStr].date)) {
              // Keep the latest entry for each date
              acc[dateStr] = item
            }
            return acc
          }, {} as Record<string, any>)
          
          // Format the data
          const formattedData: PricePoint[] = Object.values(groupedByDate).map((item: any) => ({
            date: item.date,
            price: typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price),
            isAllTimeLow: item.is_all_time_low,
            isAllTimeHigh: item.is_all_time_high,
          })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          
          // Calculate stats
          const prices = formattedData.map(item => item.price).filter(price => !isNaN(price) && price > 0)
          const minPrice = prices.length > 0 ? Math.min(...prices) : currentPrice
          const maxPrice = prices.length > 0 ? Math.max(...prices) : currentPrice  
          const avgPrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : currentPrice
          const currentDiscount = avgPrice > 0 ? ((avgPrice - Number(currentPrice)) / avgPrice) * 100 : 0
          
          setStatsData({
            avgPrice,
            minPrice,
            maxPrice,
            currentDiscount,
          })
          
          // Check if we have limited historical data
          const originalDataCount = data.length
          setHasLimitedData(originalDataCount <= 2)
          
          // If we have very few data points (less than 3), pad with current price to show a trend
          if (formattedData.length < 3) {
            const lastDate = formattedData.length > 0 ? new Date(formattedData[formattedData.length - 1].date) : new Date()
            const today = new Date()
            
            // Add points up to today if we don't have recent data
            const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff > 1) {
              for (let i = 1; i <= Math.min(daysDiff, 7); i++) {
                const date = new Date(lastDate)
                date.setDate(date.getDate() + i)
                if (date <= today) {
                  formattedData.push({
                    date: date.toISOString(),
                    price: Number(currentPrice),
                  })
                }
              }
            }
          }
          
          // Debug final formatted data
          console.log('Final formatted price history data:', formattedData)
          
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
            className={`px-1.5 py-0.5 text-xs rounded ${timeRange === '1m' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            1M
          </button>
          <button
            onClick={() => setTimeRange('3m')}
            className={`px-1.5 py-0.5 text-xs rounded ${timeRange === '3m' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            3M
          </button>
          <button
            onClick={() => setTimeRange('6m')}
            className={`px-1.5 py-0.5 text-xs rounded ${timeRange === '6m' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            6M
          </button>
        </div>
        
        <div className="flex gap-1">
          {statsData.currentDiscount > 5 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0.5">
              {statsData.currentDiscount.toFixed(0)}% below avg
            </Badge>
          )}
          {hasLimitedData && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0.5">
              Limited data
            </Badge>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Current</p>
          <p className="text-xs font-medium">{formatPrice(currentPrice)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Average</p>
          <p className="text-xs font-medium">{formatPrice(statsData.avgPrice)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Low</p>
          <p className="text-xs font-medium">{formatPrice(statsData.minPrice)}</p>
        </div>
      </div>
      
      <div className="h-32 sm:h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={priceHistory}
            margin={{ top: 5, right: 15, left: 15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(new Date(date), 'MMM d')}
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              domain={['dataMin - 50', 'dataMax + 50']}
              tickFormatter={(price) => `$${Math.round(price)}`}
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
              connectNulls={false}
            />
            {statsData.avgPrice > 0 && (
              <ReferenceLine 
                y={statsData.avgPrice} 
                stroke="#6b7280" 
                strokeDasharray="3 3" 
                label={{ 
                  value: `Avg $${Math.round(statsData.avgPrice)}`, 
                  position: 'topRight',
                  style: { fill: '#6b7280', fontSize: 9 }
                }} 
              />
            )}
          </LineChart>
        </ResponsiveContainer>
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
        
        <div className="mt-1 flex gap-2">
          {statsData.currentDiscount > 5 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {statsData.currentDiscount.toFixed(0)}% below average price
            </Badge>
          )}
          {hasLimitedData && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Limited price history - price tracking may be new for this product
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="font-medium">{formatPrice(currentPrice)}</p>
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
        <div className="h-48 sm:h-56 lg:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={priceHistory}
              margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                domain={['dataMin - 100', 'dataMax + 100']}
                tickFormatter={(price) => formatPrice(price)}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 3, stroke: '#ffffff' }}
                connectNulls={false}
              />
              {statsData.avgPrice > 0 && (
                <ReferenceLine 
                  y={statsData.avgPrice} 
                  stroke="#6b7280" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: `Average ${formatPrice(statsData.avgPrice)}`, 
                    position: 'topRight',
                    style: { fill: '#6b7280', fontSize: 10 }
                  }} 
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 