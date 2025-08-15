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
import { Copy, Link2, Youtube, Mail, AlertCircle, Search, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { YouTubeVideoSelector } from './youtube-video-selector';

interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
  description?: string;
}

interface GeneratedLink {
  url: string;
  leadMagnet: string;
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

  // Generate links
  const generateLinks = () => {
    if (!source || !medium || !campaign || !content) {
      alert('Please fill in all required fields');
      return;
    }

    const baseUrls = {
      'material-library': 'https://machinesformakers.com/laser-material-library',
      'deal-alerts': 'https://machinesformakers.com/deals'
    };

    const links: GeneratedLink[] = [];

    // Generate link for selected lead magnet or both
    const magnetsToGenerate = leadMagnet === 'both' 
      ? ['material-library', 'deal-alerts'] 
      : [leadMagnet];

    magnetsToGenerate.forEach(magnet => {
      const params = new URLSearchParams({
        utm_source: source.toLowerCase().replace(/\s+/g, '-'),
        utm_medium: medium.toLowerCase().replace(/\s+/g, '-'),
        utm_campaign: campaign.toLowerCase().replace(/\s+/g, '-'),
        utm_content: content.toLowerCase().replace(/\s+/g, '-'),
        utm_term: magnet
      });

      links.push({
        url: `${baseUrls[magnet as keyof typeof baseUrls]}?${params.toString()}`,
        leadMagnet: magnet,
        source,
        medium,
        campaign,
        content
      });
    });

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
              <Select value={leadMagnet} onValueChange={setLeadMagnet}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material-library">Material Library</SelectItem>
                  <SelectItem value="deal-alerts">Deal Alerts</SelectItem>
                  <SelectItem value="both">Generate Both</SelectItem>
                </SelectContent>
              </Select>
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
                <div key={index} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {link.leadMagnet === 'material-library' ? 'Material Library' : 'Deal Alerts'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(link.url, index)}
                    >
                      {copiedIndex === index ? (
                        'Copied!'
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                    {link.url}
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                  >
                    Test link
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}