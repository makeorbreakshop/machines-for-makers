"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { format, parseISO, startOfDay } from "date-fns"

interface EmailSignupsChartProps {
  data: Array<{
    created_at: string
    source: string
  }>
}

export function EmailSignupsChart({ data }: EmailSignupsChartProps) {
  // Group data by date
  const groupedData = data.reduce((acc, item) => {
    const date = format(startOfDay(parseISO(item.created_at)), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = 0
    }
    acc[date]++
    return acc
  }, {} as Record<string, number>)

  // Convert to array format for recharts
  const chartData = Object.entries(groupedData)
    .map(([date, count]) => ({
      date,
      signups: count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    // Only show last 30 days
    .slice(-30)

  const config = {
    signups: {
      label: "Signups",
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <ChartContainer config={config} className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(parseISO(value), 'MMM d')}
          />
          <YAxis />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => format(parseISO(value as string), 'MMM d, yyyy')}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="signups"
            stroke="var(--color-signups)"
            fill="var(--color-signups)"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}