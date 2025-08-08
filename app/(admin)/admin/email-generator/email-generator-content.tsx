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
  const [emailHtml, setEmailHtml] = useState('');
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
      
      generateEmailHtml(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Generate email HTML
  const generateEmailHtml = (deals: PriceDrop[]) => {
    if (deals.length === 0) {
      setEmailHtml('');
      return;
    }

    const heroDeal = deals[0];
    const otherDeals = deals.slice(1);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>This Week's Laser Cutter Deals</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f6f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #1a1a1a; color: #ffffff; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .stats-bar { background-color: #f0f0f0; padding: 20px; text-align: center; }
    .stat { display: inline-block; margin: 0 15px; }
    .stat-number { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .stat-label { font-size: 14px; color: #666; }
    .hero-deal { padding: 30px 20px; border-bottom: 2px solid #eee; }
    .deal-badge { background-color: #ff4444; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px; display: inline-block; margin-bottom: 10px; }
    .deal-title { font-size: 24px; margin: 10px 0; }
    .price-info { margin: 20px 0; }
    .old-price { text-decoration: line-through; color: #999; font-size: 18px; }
    .new-price { color: #ff4444; font-size: 28px; font-weight: bold; margin-left: 10px; }
    .savings { color: #22c55e; font-size: 18px; margin-left: 10px; }
    .cta-button { background-color: #1a1a1a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .deals-grid { padding: 20px; }
    .deal-card { border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
    .footer { background-color: #f0f0f0; padding: 30px 20px; text-align: center; font-size: 14px; color: #666; }
    .footer a { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🛠️ Machines for Makers Deal Alert</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Your weekly digest of laser cutter deals</p>
    </div>
    
    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat">
        <div class="stat-number">${emailStats?.totalDeals || 0}</div>
        <div class="stat-label">Deals</div>
      </div>
      <div class="stat">
        <div class="stat-number">$${emailStats?.totalSavings.toFixed(0) || 0}</div>
        <div class="stat-label">Total Savings</div>
      </div>
      <div class="stat">
        <div class="stat-number">${emailStats?.avgDiscount || 0}%</div>
        <div class="stat-label">Avg Discount</div>
      </div>
    </div>
    
    <!-- Hero Deal -->
    <div class="hero-deal">
      ${heroDeal.isAllTimeLow ? '<span class="deal-badge">🏆 ALL-TIME LOW</span>' : '<span class="deal-badge">HOT DEAL</span>'}
      <h2 class="deal-title">${heroDeal.company} ${heroDeal.machineName}</h2>
      <div class="price-info">
        <span class="old-price">$${heroDeal.previousPrice.toFixed(2)}</span>
        <span class="new-price">$${heroDeal.currentPrice.toFixed(2)}</span>
        <span class="savings">Save $${Math.abs(heroDeal.priceChange).toFixed(0)} (${Math.abs(heroDeal.percentageChange)}% off)</span>
      </div>
      <p>${heroDeal.category} • ${heroDeal.workArea || 'Various sizes available'}</p>
      <a href="https://www.machinesformakers.com${heroDeal.productLink}" class="cta-button">View Deal →</a>
    </div>
    
    <!-- Other Deals -->
    <div class="deals-grid">
      <h3 style="margin-bottom: 20px;">More Deals This Week</h3>
      ${otherDeals.map(deal => `
        <div class="deal-card">
          <h4 style="margin: 0 0 10px 0;">${deal.company} ${deal.machineName}</h4>
          <div style="margin-bottom: 10px;">
            <span class="old-price">$${deal.previousPrice.toFixed(2)}</span>
            <span style="color: #ff4444; font-size: 20px; font-weight: bold; margin-left: 10px;">$${deal.currentPrice.toFixed(2)}</span>
          </div>
          <p style="margin: 5px 0; color: #22c55e; font-weight: bold;">${Math.abs(deal.percentageChange)}% off - Save $${Math.abs(deal.priceChange).toFixed(0)}</p>
          ${deal.isAllTimeLow ? '<p style="margin: 5px 0; color: #ff4444;">🏆 All-Time Low Price!</p>' : ''}
          <a href="https://www.machinesformakers.com${deal.productLink}" style="color: #1a1a1a; font-weight: bold;">View Deal →</a>
        </div>
      `).join('')}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>You're receiving this because you signed up for deal alerts at Machines for Makers.</p>
      <p><a href="https://www.machinesformakers.com/deals">View all deals</a> • <a href="{unsubscribe_link}">Unsubscribe</a></p>
      <p style="margin-top: 20px; font-size: 12px;">© ${new Date().getFullYear()} Machines for Makers. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    setEmailHtml(html);
  };

  // Copy HTML to clipboard
  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(emailHtml);
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
          <CardDescription>Preview the generated email HTML</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="html">HTML Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-4">
              {emailHtml ? (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={emailHtml}
                    className="w-full h-[600px]"
                    title="Email Preview"
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {loading ? 'Loading deals...' : 'No email generated yet'}
                </div>
              )}
            </TabsContent>
            <TabsContent value="html" className="mt-4">
              {emailHtml ? (
                <div className="relative">
                  <Textarea
                    value={emailHtml}
                    readOnly
                    className="font-mono text-sm"
                    rows={20}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={copyHtml}
                  >
                    {copied ? 'Copied!' : <><Copy className="h-4 w-4 mr-2" /> Copy HTML</>}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No HTML generated yet
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
                <li>Copy the HTML using the button above</li>
                <li>Go to ConvertKit and create a new broadcast</li>
                <li>Paste the HTML in the email editor</li>
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