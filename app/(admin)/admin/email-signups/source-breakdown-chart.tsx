"use client"

interface SourceBreakdownChartProps {
  data: Array<{
    source: string | null
  }>
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

  // Convert to array format and sort by count
  const sortedSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source,
      label: SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] || source,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-3">
      {sortedSources.map(({ source, label, count }) => (
        <div key={source} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
          <span className="font-medium">{label}</span>
          <span className="text-2xl font-bold">{count}</span>
        </div>
      ))}
    </div>
  )
}