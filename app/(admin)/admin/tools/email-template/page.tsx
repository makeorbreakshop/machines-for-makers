"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RefreshCw, Mail, Copy, Check, Eye, TrendingDown, DollarSign, ArrowLeft, Sparkles, FileText, Calendar } from "lucide-react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import Link from "next/link"

interface EmailDeal {
  id: string
  machine_id: string
  machineName: string
  company: string
  price: number
  recordedPrice: number
  currentPrice: number
  date: string
  is_all_time_low: boolean
  priceChange: number
  percentageChange: number
}

export default function EmailTemplatePage() {
  const [emailDeals, setEmailDeals] = useState<EmailDeal[]>([])
  const [selectedDealsForEmail, setSelectedDealsForEmail] = useState<Set<string>>(new Set())
  const [dateRangeFilter, setDateRangeFilter] = useState('7')
  const [loadingEmailDeals, setLoadingEmailDeals] = useState(false)
  const [emailHtml, setEmailHtml] = useState('')
  const [emailStats, setEmailStats] = useState<any>(null)
  const [subjectLine, setSubjectLine] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchEmailDeals = async (filters?: any) => {
    try {
      const params = new URLSearchParams({
        days: filters?.dateRangeFilter || dateRangeFilter,
        limit: '100'
      })

      const response = await fetch(`/api/price-drops?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch deals')
      }

      const data = await response.json()
      const processedDeals = data.priceDrops?.map((drop: any) => ({
        id: drop.id,
        machine_id: drop.machineId,
        machineName: drop.machineName,
        company: drop.company,
        price: drop.currentPrice,
        recordedPrice: drop.previousPrice,
        currentPrice: drop.currentPrice,
        date: drop.dropDate,
        is_all_time_low: drop.isAllTimeLow,
        priceChange: drop.priceChange,
        percentageChange: drop.percentageChange
      })) || []

      return processedDeals
    } catch (error) {
      console.error('Error fetching email deals:', error)
      toast.error('Failed to fetch deals')
      return []
    }
  }

  const generateEmailFromSelected = async () => {
    if (selectedDealsForEmail.size === 0) {
      toast.error('Please select at least one deal')
      return
    }

    try {
      const selectedDealsList = emailDeals.filter(deal => selectedDealsForEmail.has(deal.id))
      
      // Calculate stats
      const totalSavings = selectedDealsList.reduce((sum, deal) => sum + Math.abs(deal.priceChange || 0), 0)
      const avgDiscount = selectedDealsList.reduce((sum, deal) => sum + Math.abs(deal.percentageChange || 0), 0) / selectedDealsList.length
      const allTimeLows = selectedDealsList.filter(deal => deal.is_all_time_low).length

      setEmailStats({
        totalDeals: selectedDealsList.length,
        totalSavings: Math.round(totalSavings),
        avgDiscount: Math.round(avgDiscount),
        allTimeLows
      })

      // Generate email content
      const emailContent = generateEmailMarkdown(selectedDealsList)
      setEmailHtml(emailContent)
      
      // Generate subject line
      const subjectOptions = [
        `🎯 ${selectedDealsList.length} Hot Deals: Save up to ${Math.round(Math.max(...selectedDealsList.map(d => Math.abs(d.percentageChange || 0))))}% on Maker Tools`,
        `💰 This Week's Best: $${Math.round(totalSavings).toLocaleString()} in Total Savings`,
        `🔥 ${allTimeLows} All-Time Lows + ${selectedDealsList.length - allTimeLows} Price Drops Inside`
      ]
      setSubjectLine(subjectOptions[0])
      
      // Generate preview text
      setPreviewText(`${selectedDealsList.length} machines on sale • Save up to $${Math.round(Math.max(...selectedDealsList.map(d => Math.abs(d.priceChange || 0)))).toLocaleString()} • Limited time deals`)
      
      toast.success('Email template generated!')
    } catch (error) {
      console.error('Error generating email:', error)
      toast.error('Failed to generate email template')
    }
  }

  const generateEmailMarkdown = (deals: EmailDeal[]) => {
    const allTimeLows = deals.filter(d => d.is_all_time_low)
    const regularDeals = deals.filter(d => !d.is_all_time_low)
    
    let markdown = `# This Week's Best Maker Machine Deals\n\n`
    markdown += `We've tracked **${deals.length} price drops** this week with total savings of **$${Math.round(deals.reduce((sum, d) => sum + Math.abs(d.priceChange || 0), 0)).toLocaleString()}**!\n\n`
    
    if (allTimeLows.length > 0) {
      markdown += `## 🏆 All-Time Low Prices\n\n`
      markdown += `These machines are at their **lowest prices ever recorded**:\n\n`
      
      allTimeLows.forEach(deal => {
        markdown += `### ${deal.machineName}\n`
        markdown += `- **Brand:** ${deal.company}\n`
        markdown += `- **Was:** $${deal.recordedPrice?.toFixed(2)}\n`
        markdown += `- **Now:** $${deal.price?.toFixed(2)} (**${Math.abs(deal.percentageChange || 0).toFixed(1)}% off**)\n`
        markdown += `- **You Save:** $${Math.abs(deal.priceChange || 0).toFixed(2)}\n\n`
      })
    }
    
    if (regularDeals.length > 0) {
      markdown += `## 💰 Price Drops\n\n`
      
      regularDeals.forEach(deal => {
        markdown += `### ${deal.machineName}\n`
        markdown += `- **Brand:** ${deal.company}\n`
        markdown += `- **Was:** $${deal.recordedPrice?.toFixed(2)}\n`
        markdown += `- **Now:** $${deal.price?.toFixed(2)} (**${Math.abs(deal.percentageChange || 0).toFixed(1)}% off**)\n`
        markdown += `- **You Save:** $${Math.abs(deal.priceChange || 0).toFixed(2)}\n\n`
      })
    }
    
    markdown += `---\n\n`
    markdown += `[View All Deals on Our Website](https://www.machinesformakers.com/deals)\n\n`
    markdown += `*Prices tracked daily. Deals may expire without notice.*`
    
    return markdown
  }

  useEffect(() => {
    // Auto-load deals on mount
    const loadInitialDeals = async () => {
      setLoadingEmailDeals(true)
      const deals = await fetchEmailDeals()
      setEmailDeals(deals)
      setLoadingEmailDeals(false)
    }
    loadInitialDeals()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50/50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/tools/price-tracker">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Price Tracker
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">Email Template Generator</h1>
              <p className="text-sm text-muted-foreground">Select deals and generate newsletter templates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              Last {dateRangeFilter} days
            </Badge>
            {emailDeals.length > 0 && (
              <Badge className="gap-1">
                <FileText className="w-3 h-3" />
                {emailDeals.length} deals available
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="flex gap-6 h-full">
          {/* Left Panel - Deal Selection */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Select Deals</CardTitle>
                  <CardDescription>Choose which price drops to include in your newsletter</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select 
                    value={dateRangeFilter} 
                    onValueChange={async (value) => {
                      setDateRangeFilter(value)
                      setLoadingEmailDeals(true)
                      setEmailDeals([])
                      const deals = await fetchEmailDeals({ dateRangeFilter: value })
                      setEmailDeals(deals)
                      setLoadingEmailDeals(false)
                      setSelectedDealsForEmail(new Set())
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="10">Last 10 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={async () => {
                      setLoadingEmailDeals(true)
                      setEmailDeals([])
                      const deals = await fetchEmailDeals()
                      setEmailDeals(deals)
                      setLoadingEmailDeals(false)
                    }}
                    disabled={loadingEmailDeals}
                    size="sm"
                  >
                    {loadingEmailDeals ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Loading
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {emailDeals.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {selectedDealsForEmail.size} of {emailDeals.length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDealsForEmail(new Set(emailDeals.map(d => d.id)))}
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDealsForEmail(new Set())}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={generateEmailFromSelected}
                    disabled={selectedDealsForEmail.size === 0}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Email
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              {loadingEmailDeals && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading deals...</p>
                  </div>
                </div>
              )}

              {!loadingEmailDeals && emailDeals.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <TrendingDown className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No deals found for the selected period</p>
                  </div>
                </div>
              )}

              {emailDeals.length > 0 && (
                <div className="overflow-auto h-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white border-b">
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedDealsForEmail.size === emailDeals.length && emailDeals.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDealsForEmail(new Set(emailDeals.map(d => d.id)))
                              } else {
                                setSelectedDealsForEmail(new Set())
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Machine</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="text-right">Was</TableHead>
                        <TableHead className="text-right">Now</TableHead>
                        <TableHead className="text-right">Savings</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailDeals.map((deal) => (
                        <TableRow 
                          key={deal.id} 
                          className={selectedDealsForEmail.has(deal.id) ? 'bg-blue-50/50' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedDealsForEmail.has(deal.id)}
                              onCheckedChange={(checked) => {
                                const newSelection = new Set(selectedDealsForEmail)
                                if (checked) {
                                  newSelection.add(deal.id)
                                } else {
                                  newSelection.delete(deal.id)
                                }
                                setSelectedDealsForEmail(newSelection)
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{deal.machineName}</div>
                            {deal.is_all_time_low && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                All-time low
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {deal.company}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            ${deal.recordedPrice?.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium">
                            ${deal.price?.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-green-600 font-medium">
                              ${Math.abs(deal.priceChange || 0).toFixed(0)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.abs(deal.percentageChange || 0).toFixed(0)}% off
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(deal.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel - Email Preview */}
          <div className="w-[600px] flex flex-col gap-4">
            {/* Stats Card */}
            {emailStats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Email Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{emailStats.totalDeals}</p>
                        <p className="text-xs text-muted-foreground">Total Deals</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">${emailStats.totalSavings.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total Savings</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingDown className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{emailStats.avgDiscount}%</p>
                        <p className="text-xs text-muted-foreground">Avg Discount</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Sparkles className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{emailStats.allTimeLows}</p>
                        <p className="text-xs text-muted-foreground">All-time Lows</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email Content Card */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Email Preview</CardTitle>
                  {emailHtml && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(emailHtml)
                          setCopied(true)
                          toast.success('Email HTML copied!')
                          setTimeout(() => setCopied(false), 2000)
                        }}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const previewWindow = window.open('', '_blank')
                          if (previewWindow) {
                            previewWindow.document.write(emailHtml)
                            previewWindow.document.close()
                          }
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              {emailHtml && (
                <CardContent className="pb-3 px-6 space-y-3">
                  <div>
                    <Label className="text-xs">Subject Line</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        value={subjectLine} 
                        onChange={(e) => setSubjectLine(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          navigator.clipboard.writeText(subjectLine)
                          toast.success('Subject copied!')
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Preview Text</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        value={previewText} 
                        onChange={(e) => setPreviewText(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          navigator.clipboard.writeText(previewText)
                          toast.success('Preview text copied!')
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
              
              <CardContent className="flex-1 overflow-auto p-6 pt-0">
                {!emailHtml ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <Mail className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="mb-2">No email generated yet</p>
                      <p className="text-sm text-muted-foreground">
                        Select deals and click "Generate Email"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border">
                    <div className="bg-gray-50 p-2 rounded-t-lg border-b">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="ml-2 text-xs text-muted-foreground">Email Preview</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            h1: ({...props}) => <h1 className="text-2xl font-bold mb-4 text-gray-900" {...props} />,
                            h2: ({...props}) => <h2 className="text-xl font-bold mb-3 mt-6 text-gray-900" {...props} />,
                            h3: ({...props}) => <h3 className="text-lg font-semibold mb-2 mt-4 text-gray-900" {...props} />,
                            p: ({...props}) => <p className="mb-4 text-gray-700 leading-relaxed" {...props} />,
                            strong: ({...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                            a: ({...props}) => <a className="text-blue-600 hover:text-blue-800 font-medium underline" {...props} />,
                            ul: ({...props}) => <ul className="mb-4 space-y-2 list-disc list-inside" {...props} />,
                            li: ({...props}) => <li className="text-gray-700" {...props} />,
                            hr: ({...props}) => <hr className="my-6 border-gray-200" {...props} />,
                          }}
                        >
                          {emailHtml}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}