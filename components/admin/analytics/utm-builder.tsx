'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Link2, Youtube, Mail, AlertCircle, ExternalLink, LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { YouTubeVideoSelector } from './youtube-video-selector';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
  description?: string;
}

interface LeadMagnet {
  id: string;
  name: string;
  slug: string;
  landing_page_url: string;
}

interface GeneratedLink {
  url: string;
  shortUrl?: string;
  shortLinkId?: string;
  leadMagnet: string;
  leadMagnetName: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
}

export function UTMBuilder() {
  // Form state
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');
  const [leadMagnet, setLeadMagnet] = useState('material-library');
  
  // YouTube specific
  const [selectedVideo, setSelectedVideo] = useState('');
  
  // Email specific
  const [emailDate, setEmailDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [emailName, setEmailName] = useState('');
  
  // Generated links
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Short link state
  const [createShortLink, setCreateShortLink] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [isValidatingSlug, setIsValidatingSlug] = useState(false);
  
  // Lead magnets from database
  const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>([]);
  const [isLoadingMagnets, setIsLoadingMagnets] = useState(true);
  
  // Fetch lead magnets on mount
  useEffect(() => {
    fetchLeadMagnets();
  }, []);
  
  const fetchLeadMagnets = async () => {
    try {
      const response = await fetch('/api/admin/lead-magnets');
      if (response.ok) {
        const data = await response.json();
        const magnets = data.leadMagnets || [];
        setLeadMagnets(magnets);
        // Set default to first active lead magnet
        if (magnets.length > 0) {
          setLeadMagnet(magnets[0].slug);
        }
      }
    } catch (error) {
      console.error('Failed to fetch lead magnets:', error);
    } finally {
      setIsLoadingMagnets(false);
    }
  };

  // Common campaign templates
  const campaignTemplates = {
    youtube: {
      source: 'youtube',
      medium: 'video',
      contentOptions: [
        { value: 'description-link-1', label: 'Description - First Link' },
        { value: 'description-link-2', label: 'Description - Second Link' },
        { value: 'pinned-comment', label: 'Pinned Comment' },
        { value: 'video-card', label: 'Video Card/End Screen' },
      ]
    },
    email: {
      source: 'newsletter',
      medium: 'email',
      contentOptions: [
        { value: 'header-cta', label: 'Header CTA Button' },
        { value: 'body-link', label: 'Body Content Link' },
        { value: 'footer-link', label: 'Footer Link' },
        { value: 'ps-link', label: 'P.S. Section Link' },
      ]
    },
    affiliate: {
      source: '', // Will be filled with partner name
      medium: 'referral',
      contentOptions: [
        { value: 'blog-post', label: 'Blog Post' },
        { value: 'sidebar', label: 'Sidebar Widget' },
        { value: 'review', label: 'Product Review' },
        { value: 'resource-page', label: 'Resource Page' },
      ]
    }
  };


  // Generate campaign name based on type
  const generateCampaignName = (type: string) => {
    switch (type) {
      case 'youtube':
        // The campaign name will be set by the video selector
        return campaign || '';
      
      case 'email':
        if (emailName) {
          const dateStr = format(new Date(emailDate), 'yyyy-MM');
          const sanitizedName = emailName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          return `email-${dateStr}-${sanitizedName}`;
        }
        return '';
      
      case 'affiliate':
        return campaign; // User provides custom campaign
      
      default:
        return '';
    }
  };
  
  // Generate slug for short link
  const generateSlug = (campaignName: string, leadMagnetSlug: string) => {
    if (!campaignName) return '';
    
    // Extract key parts from campaign name
    let slug = '';
    
    if (campaignName.startsWith('yt-')) {
      // YouTube: yt-{videoId}-{title} -> yt-{videoId}-{magnet}
      const parts = campaignName.split('-');
      if (parts.length >= 2) {
        const videoId = parts[1];
        const magnetPart = leadMagnetSlug === 'material-library' ? 'material' : 'deals';
        slug = `yt-${videoId}-${magnetPart}`;
      }
    } else if (campaignName.startsWith('email-')) {
      // Email: email-2024-08-name -> email-240818-name-{magnet}
      const dateMatch = campaignName.match(/email-(\d{4}-\d{2})-(.+)/);
      if (dateMatch) {
        const [_, date, name] = dateMatch;
        const shortDate = date.substring(2).replace('-', '');
        const magnetPart = leadMagnetSlug === 'material-library' ? 'material' : 'deals';
        slug = `email-${shortDate}-${name}-${magnetPart}`;
      }
    } else if (campaignName.includes('affiliate-')) {
      // Affiliate: affiliate-partner-campaign -> partner-campaign-{magnet}
      const cleanName = campaignName.replace('affiliate-', '');
      const magnetPart = leadMagnetSlug === 'material-library' ? 'material' : 'deals';
      slug = `${cleanName}-${magnetPart}`;
    } else {
      // Fallback: just append magnet to campaign
      const magnetPart = leadMagnetSlug === 'material-library' ? 'material' : 'deals';
      slug = `${campaignName}-${magnetPart}`;
    }
    
    // Ensure slug is URL-safe and reasonable length
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };
  
  // Update custom slug when campaign or lead magnet changes
  useEffect(() => {
    if (createShortLink && campaign && leadMagnet && leadMagnet !== 'both') {
      const generatedSlug = generateSlug(campaign, leadMagnet);
      setCustomSlug(generatedSlug);
    }
  }, [campaign, leadMagnet, createShortLink]);
  
  // Validate slug availability
  const validateSlug = async (slug: string) => {
    if (!slug) {
      setSlugError('');
      return true;
    }
    
    setIsValidatingSlug(true);
    try {
      const response = await fetch('/api/admin/links/validate-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      
      const data = await response.json();
      if (!data.available) {
        setSlugError('This slug is already in use');
        return false;
      } else {
        setSlugError('');
        return true;
      }
    } catch (error) {
      setSlugError('Failed to validate slug');
      return false;
    } finally {
      setIsValidatingSlug(false);
    }
  };
  
  // Debounced slug validation
  useEffect(() => {
    if (customSlug && createShortLink) {
      const timer = setTimeout(() => {
        validateSlug(customSlug);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [customSlug, createShortLink]);

  // Generate links
  const generateLinks = async () => {
    if (!source || !medium || !campaign || !content) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (createShortLink && slugError) {
      toast.error('Please fix the slug error before generating links');
      return;
    }

    const links: GeneratedLink[] = [];

    // Generate link for selected lead magnet or both
    const magnetsToGenerate = leadMagnet === 'both' 
      ? leadMagnets.map(m => m.slug)
      : [leadMagnet];

    for (const magnetSlug of magnetsToGenerate) {
      const magnet = leadMagnets.find(m => m.slug === magnetSlug);
      if (!magnet) continue;
      
      const params = new URLSearchParams({
        utm_source: source.toLowerCase().replace(/\s+/g, '-'),
        utm_medium: medium.toLowerCase().replace(/\s+/g, '-'),
        utm_campaign: campaign.toLowerCase().replace(/\s+/g, '-'),
        utm_content: content.toLowerCase().replace(/\s+/g, '-'),
        utm_term: magnetSlug
      });
      
      const baseUrl = `${window.location.origin}${magnet.landing_page_url}`;
      const fullUrl = `${baseUrl}?${params.toString()}`;
      
      const linkData: GeneratedLink = {
        url: fullUrl,
        leadMagnet: magnetSlug,
        leadMagnetName: magnet.name,
        source,
        medium,
        campaign,
        content
      };
      
      // Create short link if enabled
      if (createShortLink) {
        try {
          const slug = magnetsToGenerate.length > 1 
            ? `${customSlug}-${magnetSlug === 'material-library' ? 'material' : magnetSlug}`
            : customSlug;
            
          const response = await fetch('/api/admin/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug,
              destination_url: magnet.landing_page_url,
              type: 'campaign',
              campaign: campaign,
              utm_source: source,
              utm_medium: medium,
              utm_campaign: campaign,
              utm_content: content,
              utm_term: magnetSlug,
              append_utms: true,
              active: true,
              metadata: {
                created_from: 'utm-builder',
                lead_magnet_id: magnet.id
              }
            }),
          });
          
          if (response.ok) {
            const shortLink = await response.json();
            linkData.shortUrl = `${window.location.origin}/go/${shortLink.slug}`;
            linkData.shortLinkId = shortLink.id;
            toast.success(`Short link created: /go/${shortLink.slug}`);
          } else {
            const error = await response.json();
            toast.error(`Failed to create short link: ${error.error}`);
          }
        } catch (error) {
          console.error('Failed to create short link:', error);
          toast.error('Failed to create short link');
        }
      }

      links.push(linkData);
    }

    setGeneratedLinks(links);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setSource('');
    setMedium('');
    setCampaign('');
    setContent('');
    setSelectedVideo('');
    setEmailName('');
    setGeneratedLinks([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>UTM Link Builder</CardTitle>
          <CardDescription>
            Generate tracked links for your marketing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="youtube" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="youtube" onClick={() => {
                setSource('youtube');
                setMedium('video');
                setContent('');
              }}>
                <Youtube className="h-4 w-4 mr-2" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="email" onClick={() => {
                setSource('newsletter');
                setMedium('email');
                setContent('');
              }}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="affiliate" onClick={() => {
                setSource('');
                setMedium('referral');
                setContent('');
              }}>
                <Link2 className="h-4 w-4 mr-2" />
                Affiliate
              </TabsTrigger>
            </TabsList>

            {/* YouTube Tab */}
            <TabsContent value="youtube" className="space-y-4">
              <YouTubeVideoSelector
                value={selectedVideo}
                onValueChange={(value) => {
                  setSelectedVideo(value);
                }}
                onVideoSelect={(video) => {
                  const sanitizedTitle = video.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .substring(0, 30);
                  setCampaign(`yt-${video.id}-${sanitizedTitle}`);
                }}
              />

              <div className="space-y-2">
                <Label>Link Placement</Label>
                <Select value={content} onValueChange={setContent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Where will this link appear?" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTemplates.youtube.contentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Email Tab */}
            <TabsContent value="email" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Date</Label>
                  <Input
                    type="date"
                    value={emailDate}
                    onChange={(e) => {
                      setEmailDate(e.target.value);
                      if (emailName) {
                        setCampaign(generateCampaignName('email'));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="e.g., black-friday, weekly-digest"
                    value={emailName}
                    onChange={(e) => {
                      setEmailName(e.target.value);
                      setCampaign(generateCampaignName('email'));
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Link Placement</Label>
                <Select value={content} onValueChange={setContent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Where will this link appear?" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTemplates.email.contentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Affiliate Tab */}
            <TabsContent value="affiliate" className="space-y-4">
              <div className="space-y-2">
                <Label>Partner Name</Label>
                <Input
                  placeholder="e.g., partner-xyz, blog-name"
                  value={source}
                  onChange={(e) => setSource(`affiliate-${e.target.value}`)}
                />
              </div>

              <div className="space-y-2">
                <Label>Campaign Identifier</Label>
                <Input
                  placeholder="e.g., spring-2024, product-review"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Link Placement</Label>
                <Select value={content} onValueChange={setContent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Where will this link appear?" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTemplates.affiliate.contentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {/* Common fields */}
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Lead Magnet</Label>
              <Select 
                value={leadMagnet} 
                onValueChange={setLeadMagnet}
                disabled={isLoadingMagnets}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead magnet" />
                </SelectTrigger>
                <SelectContent>
                  {leadMagnets.map((magnet) => (
                    <SelectItem key={magnet.id} value={magnet.slug}>
                      {magnet.name}
                    </SelectItem>
                  ))}
                  {leadMagnets.length > 1 && (
                    <SelectItem value="both">Generate Both</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Short Link Option */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-short-link"
                  checked={createShortLink}
                  onCheckedChange={(checked) => setCreateShortLink(checked as boolean)}
                />
                <Label htmlFor="create-short-link" className="cursor-pointer">
                  Create short link
                </Label>
              </div>
              
              {createShortLink && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="custom-slug">Short link slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/go/</span>
                    <Input
                      id="custom-slug"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      placeholder="custom-slug"
                      className={slugError ? 'border-red-500' : ''}
                    />
                    {isValidatingSlug && (
                      <span className="text-sm text-muted-foreground">Checking...</span>
                    )}
                  </div>
                  {slugError && (
                    <p className="text-sm text-red-500">{slugError}</p>
                  )}
                  {!slugError && customSlug && !isValidatingSlug && (
                    <p className="text-sm text-green-600">Slug is available</p>
                  )}
                </div>
              )}
            </div>

            {/* Preview */}
            {campaign && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Campaign Preview:</p>
                    <div className="text-xs space-y-1 font-mono">
                      <div>Source: {source}</div>
                      <div>Medium: {medium}</div>
                      <div>Campaign: {campaign}</div>
                      <div>Content: {content || '(not set)'}</div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={generateLinks} className="flex-1">
                Generate Links
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </div>

          {/* Generated Links */}
          {generatedLinks.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="font-medium">Generated Links</h4>
              {generatedLinks.map((link, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {link.leadMagnetName}
                    </Badge>
                    {link.shortLinkId && (
                      <a
                        href={`/admin/links/${link.shortLinkId}`}
                        className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                      >
                        View Analytics
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  
                  {/* Short URL (if created) */}
                  {link.shortUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <LinkIcon className="h-4 w-4" />
                          Short Link
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(link.shortUrl!, index * 2)}
                        >
                          {copiedIndex === index * 2 ? (
                            'Copied!'
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 p-2 rounded text-xs font-mono">
                        {link.shortUrl}
                      </div>
                    </div>
                  )}
                  
                  {/* Full UTM URL */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Full UTM URL</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(link.url, index * 2 + 1)}
                      >
                        {copiedIndex === index * 2 + 1 ? (
                          'Copied!'
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                      {link.url}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href={link.shortUrl || link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                    >
                      Test link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}