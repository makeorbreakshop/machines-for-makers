'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Eye, Loader2, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

interface PriceDrop {
  id: string;
  machineId: string;
  machineName: string;
  company: string;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  percentageChange: number;
  dropDate: string;
  isAllTimeLow: boolean;
  productLink: string;
  affiliateLink?: string;
  imageUrl?: string;
  category: string;
  priceCategory?: string;
  award?: string;
  workArea?: string;
}

interface EmailStats {
  totalDeals: number;
  totalSavings: number;
  avgDiscount: number;
  allTimeLows: number;
}

export function EmailGeneratorContent() {
  const [loading, setLoading] = useState(false);
  const [drops, setDrops] = useState<PriceDrop[]>([]);
  const [selectedDrops, setSelectedDrops] = useState<PriceDrop[]>([]);
  const [emailContent, setEmailContent] = useState('');
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [dateRange, setDateRange] = useState('10');
  const [minDiscount, setMinDiscount] = useState('10');
  const [error, setError] = useState<string | null>(null);
  const [subjectLine, setSubjectLine] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch deals
  const fetchDeals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        days: dateRange,
        limit: '50'
      });

      const response = await fetch(`/api/price-drops?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch price drops');
      }

      const data = await response.json();
      const allDrops = data.priceDrops || [];
      
      // Filter by minimum discount
      const filtered = allDrops.filter((drop: PriceDrop) => 
        Math.abs(drop.percentageChange) >= parseInt(minDiscount)
      );

      // Sort by percentage discount (biggest first)
      filtered.sort((a: PriceDrop, b: PriceDrop) => a.percentageChange - b.percentageChange);
      
      // Select top 10 for the email
      const selected = filtered.slice(0, 10);
      
      setDrops(filtered);
      setSelectedDrops(selected);
      
      // Calculate stats
      if (selected.length > 0) {
        const stats: EmailStats = {
          totalDeals: selected.length,
          totalSavings: selected.reduce((sum, drop) => sum + Math.abs(drop.priceChange), 0),
          avgDiscount: Math.round(selected.reduce((sum, drop) => sum + Math.abs(drop.percentageChange), 0) / selected.length),
          allTimeLows: selected.filter(drop => drop.isAllTimeLow).length
        };
        setEmailStats(stats);
        
        // Generate subject line
        const topDeal = selected[0];
        setSubjectLine(`🔥 ${topDeal.company} ${topDeal.machineName} hits ${Math.abs(topDeal.percentageChange)}% off (+ ${selected.length - 1} more deals)`);
        setPreviewText(`Save up to $${Math.abs(topDeal.priceChange).toFixed(0)} on laser cutters this week`);
      }
      
      generateEmailContent(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Generate email markdown
  const generateEmailContent = (deals: PriceDrop[]) => {
    if (deals.length === 0) {
      setEmailContent('');
      return;
    }

    const heroDeal = deals[0];
    const otherDeals = deals.slice(1);

    const markdown = `# 🔥 This Week's Laser Cutter Deals - Machines for Makers

## 📊 Deal Summary
- **${emailStats?.totalDeals || 0}** total deals
- **$${emailStats?.totalSavings.toFixed(0) || 0}** total savings
- **${emailStats?.avgDiscount || 0}%** average discount${emailStats?.allTimeLows ? `\n- **${emailStats.allTimeLows}** all-time low${emailStats.allTimeLows > 1 ? 's' : ''}` : ''}

---

## 🎯 BIGGEST DISCOUNT THIS WEEK

### ${heroDeal.company} ${heroDeal.machineName}
**💰 $${heroDeal.currentPrice.toFixed(0)}** *(was $${heroDeal.previousPrice.toFixed(0)})*

🏷️ **${Math.abs(heroDeal.percentageChange)}% OFF** - Save $${Math.abs(heroDeal.priceChange).toFixed(0)}${heroDeal.isAllTimeLow ? ' ⭐ **ALL-TIME LOW!**' : ''}

${heroDeal.category} • ${heroDeal.workArea || 'Various sizes available'}

**[👉 VIEW DEAL](https://www.machinesformakers.com${heroDeal.productLink})**

---

## 💰 More Great Deals

${otherDeals.map(deal => `**${deal.company} ${deal.machineName}**  
💰 **$${deal.currentPrice.toFixed(0)}** *(was $${deal.previousPrice.toFixed(0)})* • **${Math.abs(deal.percentageChange)}% OFF**${deal.isAllTimeLow ? ' ⭐' : ''}  
**[👉 VIEW DEAL](https://www.machinesformakers.com${deal.productLink})**

`).join('')}

---

Happy making!  
**The Machines for Makers Team**

[Visit our website: https://machinesformakers.com](https://machinesformakers.com)

[Unsubscribe]({unsubscribe_link})`;

    setEmailContent(markdown);
  };

  // Copy markdown to clipboard
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  // Load deals on mount
  useEffect(() => {
    fetchDeals();
  }, [dateRange, minDiscount]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Filters</CardTitle>
          <CardDescription>Configure which deals to include in the email</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date-range">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="10">Last 10 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="min-discount">Minimum Discount</Label>
            <Select value={minDiscount} onValueChange={setMinDiscount}>
              <SelectTrigger id="min-discount">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5% or more</SelectItem>
                <SelectItem value="10">10% or more</SelectItem>
                <SelectItem value="15">15% or more</SelectItem>
                <SelectItem value="20">20% or more</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email Details */}
      <Card>
        <CardHeader>
          <CardTitle>Email Details</CardTitle>
          <CardDescription>Subject line and preview text for the email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={subjectLine}
              onChange={(e) => setSubjectLine(e.target.value)}
              placeholder="Email subject line"
            />
          </div>
          <div>
            <Label htmlFor="preview">Preview Text</Label>
            <Textarea
              id="preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Preview text that appears in inbox"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      {emailStats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deals</p>
                  <p className="text-2xl font-bold">{emailStats.totalDeals}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Savings</p>
                  <p className="text-2xl font-bold">${emailStats.totalSavings.toFixed(0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Discount</p>
                  <p className="text-2xl font-bold">{emailStats.avgDiscount}%</p>
                </div>
                <TrendingDown className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">All-Time Lows</p>
                  <p className="text-2xl font-bold">{emailStats.allTimeLows}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
          <CardDescription>Preview the generated email markdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="markdown">Markdown Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-4">
              {emailContent ? (
                <div className="border rounded-lg p-6 bg-white max-h-[600px] overflow-y-auto">
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
                      {emailContent}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {loading ? 'Loading deals...' : 'No email generated yet'}
                </div>
              )}
            </TabsContent>
            <TabsContent value="markdown" className="mt-4">
              {emailContent ? (
                <div className="relative">
                  <Textarea
                    value={emailContent}
                    readOnly
                    className="font-mono text-sm"
                    rows={20}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={copyContent}
                  >
                    {copied ? 'Copied!' : <><Copy className="h-4 w-4 mr-2" /> Copy Markdown</>}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No markdown generated yet
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Send this email to your subscribers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={fetchDeals} 
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Deals...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Refresh Deals
              </>
            )}
          </Button>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>To send this email:</strong>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                <li>Copy the markdown using the button above</li>
                <li>Go to ConvertKit and create a new broadcast</li>
                <li>Paste the markdown in the email editor</li>
                <li>Set the subject line and preview text from above</li>
                <li>Schedule for Tuesday at 10am ET</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}