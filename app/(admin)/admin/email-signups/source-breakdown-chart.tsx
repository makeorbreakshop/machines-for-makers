"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface SourceBreakdownChartProps {
  data: Array<{
    source: string | null
  }>
}

const COLORS = {
  'deals-page': 'hsl(var(--chart-1))',
  'material-library': 'hsl(var(--chart-2))',
  'settings-library': 'hsl(var(--chart-3))',
  'other': 'hsl(var(--chart-4))',
}

const SOURCE_LABELS = {
  'deals-page': 'Deal Alerts',
  'material-library': 'Material Library',
  'settings-library': 'Settings Library',
  'other': 'Other',
}

export function SourceBreakdownChart({ data }: SourceBreakdownChartProps) {
  // Count by source
  const sourceCounts = data.reduce((acc, item) => {
    const source = item.source || 'other'
    if (!acc[source]) {
      acc[source] = 0
    }
    acc[source]++
    return acc
  }, {} as Record<string, number>)

  // Convert to array format for recharts
  const chartData = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      name: SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] || source,
      value: count,
      fill: COLORS[source as keyof typeof COLORS] || COLORS.other,
    }))
    .sort((a, b) => b.value - a.value)

  const config = Object.entries(SOURCE_LABELS).reduce((acc, [key, label]) => {
    acc[key] = {
      label,
      color: COLORS[key as keyof typeof COLORS],
    }
    return acc
  }, {} as any)

  return (
    <ChartContainer config={config} className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}