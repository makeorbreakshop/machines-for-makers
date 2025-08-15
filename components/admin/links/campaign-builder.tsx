'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Youtube, Mail, Star, Link2, Calendar, User, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CampaignBuilderProps {
  onCampaignGenerate: (campaign: {
    slug: string;
    destination_url: string;
    type: string;
    campaign: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content?: string;
  }) => void;
}

export function CampaignBuilder({ onCampaignGenerate }: CampaignBuilderProps) {
  const [activeTab, setActiveTab] = useState('youtube');
  
  // YouTube specific
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubePlacement, setYoutubePlacement] = useState('description-link-1');
  
  // Email specific  
  const [emailDate, setEmailDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [emailName, setEmailName] = useState('');
  const [emailPlacement, setEmailPlacement] = useState('header-cta');
  
  // Affiliate specific
  const [partnerName, setPartnerName] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [affiliatePlacement, setAffiliatePlacement] = useState('blog-post');
  
  // Lead magnet selection
  const [leadMagnet, setLeadMagnet] = useState('material-library');

  const leadMagnets = {
    'material-library': {
      url: '/laser-material-library',
      title: 'Laser Material Library',
      description: 'Free guide to laser cutting materials'
    },
    'deal-alerts': {
      url: '/deals',
      title: 'Deal Alerts',
      description: 'Machine deal notifications'
    },
    'both': {
      url: 'both',
      title: 'Both Lead Magnets',
      description: 'Generate links for both'
    }
  };

  const placementOptions = {
    youtube: [
      { value: 'description-link-1', label: 'Description - First Link' },
      { value: 'description-link-2', label: 'Description - Second Link' },
      { value: 'pinned-comment', label: 'Pinned Comment' },
      { value: 'video-card', label: 'Video Card/End Screen' },
    ],
    email: [
      { value: 'header-cta', label: 'Header CTA Button' },
      { value: 'body-link', label: 'Body Content Link' },
      { value: 'footer-link', label: 'Footer Link' },
      { value: 'ps-link', label: 'P.S. Section Link' },
    ],
    affiliate: [
      { value: 'blog-post', label: 'Blog Post' },
      { value: 'sidebar', label: 'Sidebar Widget' },
      { value: 'review', label: 'Product Review' },
      { value: 'resource-page', label: 'Resource Page' },
    ]
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const generateCampaign = () => {
    let campaign = '';
    let source = '';
    let medium = '';
    let content = '';
    
    switch (activeTab) {
      case 'youtube':
        if (!youtubeTitle) {
          toast.error('Please enter a video title');
          return;
        }
        campaign = slugify(youtubeTitle);
        source = 'youtube';
        medium = 'video';
        content = youtubePlacement;
        break;
        
      case 'email':
        if (!emailName) {
          toast.error('Please enter an email campaign name');
          return;
        }
        const dateStr = format(new Date(emailDate), 'yyyy-MM');
        campaign = `${dateStr}-${slugify(emailName)}`;
        source = 'newsletter';
        medium = 'email';
        content = emailPlacement;
        break;
        
      case 'affiliate':
        if (!partnerName) {
          toast.error('Please enter a partner name');
          return;
        }
        campaign = campaignId ? `${slugify(partnerName)}-${campaignId}` : slugify(partnerName);
        source = slugify(partnerName);
        medium = 'referral';
        content = affiliatePlacement;
        break;
    }

    // Generate links based on lead magnet selection
    if (leadMagnet === 'both') {
      // Generate for both lead magnets
      ['material-library', 'deal-alerts'].forEach(magnet => {
        const magnetData = leadMagnets[magnet as keyof typeof leadMagnets];
        const slug = `${campaign}-${magnet === 'material-library' ? 'materials' : 'deals'}`;
        
        onCampaignGenerate({
          slug,
          destination_url: magnetData.url,
          type: 'lead-magnet',
          campaign,
          utm_source: source,
          utm_medium: medium,
          utm_campaign: campaign,
          utm_content: content,
        });
      });
    } else {
      const magnetData = leadMagnets[leadMagnet as keyof typeof leadMagnets];
      const slug = campaign;
      
      onCampaignGenerate({
        slug,
        destination_url: magnetData.url,
        type: activeTab === 'affiliate' ? 'affiliate' : 'lead-magnet',
        campaign,
        utm_source: source,
        utm_medium: medium,
        utm_campaign: campaign,
        utm_content: content,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Campaign Link Builder
        </CardTitle>
        <CardDescription>
          Quickly generate short links for common marketing campaigns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Affiliate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-4">
            <div>
              <Label htmlFor="youtube-title">Video Title *</Label>
              <Input
                id="youtube-title"
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
                placeholder="5 Best Laser Cutters Under $500"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                This will be used to generate the campaign name
              </p>
            </div>

            <div>
              <Label htmlFor="youtube-placement">Link Placement</Label>
              <Select value={youtubePlacement} onValueChange={setYoutubePlacement}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {placementOptions.youtube.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email-date">Email Date</Label>
                <Input
                  id="email-date"
                  type="date"
                  value={emailDate}
                  onChange={(e) => setEmailDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email-name">Campaign Name *</Label>
                <Input
                  id="email-name"
                  value={emailName}
                  onChange={(e) => setEmailName(e.target.value)}
                  placeholder="weekly-roundup"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email-placement">Link Placement</Label>
              <Select value={emailPlacement} onValueChange={setEmailPlacement}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {placementOptions.email.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="affiliate" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partner-name">Partner Name *</Label>
                <Input
                  id="partner-name"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="maker-space-blog"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="campaign-id">Campaign ID</Label>
                <Input
                  id="campaign-id"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  placeholder="summer2024"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">Optional</p>
              </div>
            </div>

            <div>
              <Label htmlFor="affiliate-placement">Link Placement</Label>
              <Select value={affiliatePlacement} onValueChange={setAffiliatePlacement}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {placementOptions.affiliate.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        {/* Lead Magnet Selection */}
        <div>
          <Label>Lead Magnet Target</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {Object.entries(leadMagnets).map(([key, magnet]) => (
              <Button
                key={key}
                variant={leadMagnet === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLeadMagnet(key)}
                className="h-auto p-3 flex flex-col items-start"
              >
                <div className="font-medium text-sm">{magnet.title}</div>
                <div className="text-xs opacity-75">{magnet.description}</div>
              </Button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {(() => {
          let previewCampaign = '';
          let previewSource = '';
          
          switch (activeTab) {
            case 'youtube':
              if (youtubeTitle) {
                previewCampaign = slugify(youtubeTitle);
                previewSource = 'youtube';
              }
              break;
            case 'email':
              if (emailName) {
                const dateStr = format(new Date(emailDate), 'yyyy-MM');
                previewCampaign = `${dateStr}-${slugify(emailName)}`;
                previewSource = 'newsletter';
              }
              break;
            case 'affiliate':
              if (partnerName) {
                previewCampaign = campaignId ? `${slugify(partnerName)}-${campaignId}` : slugify(partnerName);
                previewSource = slugify(partnerName);
              }
              break;
          }
          
          if (previewCampaign) {
            return (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium text-sm mb-2">Preview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{previewSource}</Badge>
                    <code>{previewCampaign}</code>
                  </div>
                  {leadMagnet === 'both' ? (
                    <div className="space-y-1">
                      <div>/go/{previewCampaign}-materials → Material Library</div>
                      <div>/go/{previewCampaign}-deals → Deal Alerts</div>
                    </div>
                  ) : (
                    <div>/go/{previewCampaign} → {leadMagnets[leadMagnet as keyof typeof leadMagnets].title}</div>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })()}

        <Button onClick={generateCampaign} className="w-full" size="lg">
          Generate Campaign Link{leadMagnet === 'both' ? 's' : ''}
        </Button>
      </CardContent>
    </Card>
  );
}