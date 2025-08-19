"use client"

import { useState } from "react"
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
import { RefreshCw, Mail, Copy, Check, Eye, TrendingDown, DollarSign } from "lucide-react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"

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

interface EmailTemplateTabProps {
  emailDeals: EmailDeal[]
  setEmailDeals: (deals: EmailDeal[]) => void
  selectedDealsForEmail: Set<string>
  setSelectedDealsForEmail: (set: Set<string>) => void
  dateRangeFilter: string
  setDateRangeFilter: (value: string) => void
  loadingEmailDeals: boolean
  setLoadingEmailDeals: (loading: boolean) => void
  emailHtml: string
  setEmailHtml: (html: string) => void
  emailStats: any
  setEmailStats: (stats: any) => void
  subjectLine: string
  setSubjectLine: (line: string) => void
  previewText: string
  setPreviewText: (text: string) => void
  fetchEmailDeals: (filters?: any) => Promise<EmailDeal[]>
  generateEmailFromSelected: () => Promise<void>
}

export function EmailTemplateTab({
  emailDeals,
  setEmailDeals,
  selectedDealsForEmail,
  setSelectedDealsForEmail,
  dateRangeFilter,
  setDateRangeFilter,
  loadingEmailDeals,
  setLoadingEmailDeals,
  emailHtml,
  setEmailHtml,
  emailStats,
  setEmailStats,
  subjectLine,
  setSubjectLine,
  previewText,
  setPreviewText,
  fetchEmailDeals,
  generateEmailFromSelected
}: EmailTemplateTabProps) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-300px)]">
      {/* Left Pane - Deal Selection */}
      <div className="col-span-7 border rounded-lg bg-white overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold mb-3">Select Deals for Email</h3>
          <div className="flex items-center gap-4">
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
              <SelectTrigger className="w-[200px]">
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
            >
              {loadingEmailDeals ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Load Deals
                </>
              )}
            </Button>
            {emailDeals.length > 0 && (
              <>
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
              </>
            )}
          </div>
          {emailDeals.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {emailDeals.length} deals found • {selectedDealsForEmail.size} selected
            </p>
          )}
        </div>

        {/* Deals Table */}
        <div className="flex-1 overflow-y-auto">
          {loadingEmailDeals && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading deals...</p>
              </div>
            </div>
          )}

          {!loadingEmailDeals && emailDeals.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <TrendingDown className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Click "Load Deals" to fetch available price drops</p>
              </div>
            </div>
          )}

          {emailDeals.length > 0 && (
            <Table>
              <TableHeader className="sticky top-0 bg-white">
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
                  <TableHead>Previous</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Savings</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailDeals.map((deal) => (
                  <TableRow key={deal.id} className={selectedDealsForEmail.has(deal.id) ? 'bg-blue-50' : ''}>
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
                    <TableCell className="font-medium">
                      {deal.machineName}
                      <div className="text-xs text-muted-foreground">{deal.company}</div>
                    </TableCell>
                    <TableCell>${deal.recordedPrice?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell>${deal.price?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-green-600">
                      ${Math.abs(deal.priceChange || 0).toFixed(2)}
                      <div className="text-xs">{Math.abs(deal.percentageChange || 0).toFixed(1)}%</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(deal.date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Right Pane - Email Preview */}
      <div className="col-span-5 border rounded-lg bg-gray-50 overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Email Preview</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={generateEmailFromSelected}
                disabled={selectedDealsForEmail.size === 0}
              >
                <Mail className="w-4 h-4 mr-2" />
                Generate Email
              </Button>
              {emailHtml && (
                <>
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
                        Copy HTML
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
                    New Tab
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Email Stats Bar */}
          {emailStats && (
            <div className="grid grid-cols-2 gap-4 text-sm p-3 bg-blue-50 rounded-lg">
              <div>
                <span className="text-muted-foreground">Total Deals:</span>
                <span className="ml-2 font-semibold">{emailStats.totalDeals}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Savings:</span>
                <span className="ml-2 font-semibold text-green-600">${emailStats.totalSavings.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Discount:</span>
                <span className="ml-2 font-semibold">{emailStats.avgDiscount}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">All-time Lows:</span>
                <span className="ml-2 font-semibold">{emailStats.allTimeLows}</span>
              </div>
            </div>
          )}

          {/* Subject and Preview Text */}
          {emailHtml && (
            <div className="space-y-3 mt-3">
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
                    className="h-8 w-8"
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
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(previewText)
                      toast.success('Preview text copied!')
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email Content Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          {!emailHtml ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <Mail className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="mb-2">No email generated yet</p>
                <p className="text-sm text-muted-foreground">
                  Select deals from the left panel and click "Generate Email"
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="bg-gray-100 p-2 rounded-t-lg border-b">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div className="p-6">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown 
                    components={{
                      h1: ({...props}) => <h1 className="text-2xl font-bold mb-4 text-gray-900" {...props} />,
                      h2: ({...props}) => <h2 className="text-xl font-bold mb-3 mt-6 text-gray-900" {...props} />,
                      h3: ({...props}) => <h3 className="text-lg font-bold mb-2 mt-4 text-gray-900" {...props} />,
                      p: ({...props}) => <p className="mb-4 text-gray-700 leading-relaxed" {...props} />,
                      strong: ({...props}) => <strong className="font-bold text-gray-900" {...props} />,
                      a: ({...props}) => <a className="text-blue-600 hover:text-blue-800 font-medium" {...props} />,
                      ul: ({...props}) => <ul className="mb-4 space-y-1" {...props} />,
                      li: ({...props}) => <li className="text-gray-700" {...props} />,
                      hr: ({...props}) => <hr className="my-6 border-gray-300" {...props} />,
                    }}
                  >
                    {emailHtml}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}