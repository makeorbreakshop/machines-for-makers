'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Copy, Loader2, Link, Target } from 'lucide-react';
import { YouTubeVideoSelectorEnhanced } from '@/components/admin/analytics/youtube-video-selector-enhanced';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

interface QuickLinkCreatorProps {
  onLinkCreated: () => void;
}

export function QuickLinkCreatorV2({ onLinkCreated }: QuickLinkCreatorProps) {
  // Core state
  const [linkMode, setLinkMode] = useState<'lead-magnet' | 'custom-url'>('lead-magnet');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  // Lead magnets data
  const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>([]);
  const [loadingMagnets, setLoadingMagnets] = useState(true);

  // Campaign type definitions (shared between both modes)
  const campaignTypes = {
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
    social: {
      source: '', // Will be set based on platform
      medium: 'social',
      contentOptions: [
        { value: 'bio-link', label: 'Bio Link' },
        { value: 'post-link', label: 'Post Content Link' },
        { value: 'story-link', label: 'Story Link' },
        { value: 'dm-link', label: 'Direct Message' },
      ]
    },
    general: {
      source: 'website',
      medium: 'referral',
      contentOptions: [
        { value: 'cta-button', label: 'CTA Button' },
        { value: 'inline-link', label: 'Inline Text Link' },
        { value: 'banner', label: 'Banner/Ad' },
        { value: 'footer', label: 'Footer Link' },
      ]
    }
  };

  // ==== LEAD MAGNET MODE STATE ====
  const [lmCampaignType, setLmCampaignType] = useState('youtube');
  const [lmDestination, setLmDestination] = useState('');
  const [lmLinkPlacement, setLmLinkPlacement] = useState('description-link-1');
  
  // Lead Magnet - YouTube
  const [lmSelectedVideo, setLmSelectedVideo] = useState('');
  const [lmSelectedVideoData, setLmSelectedVideoData] = useState<YouTubeVideo | null>(null);
  
  // Lead Magnet - Email
  const [lmEmailSubject, setLmEmailSubject] = useState('');
  
  // Lead Magnet - Social
  const [lmSocialPlatform, setLmSocialPlatform] = useState('instagram');
  const [lmSocialContent, setLmSocialContent] = useState('');
  
  // Lead Magnet - General
  const [lmCampaignName, setLmCampaignName] = useState('');

  // ==== CUSTOM URL MODE STATE ====
  const [cuCampaignType, setCuCampaignType] = useState('youtube');
  const [cuDestinationUrl, setCuDestinationUrl] = useState('');
  const [cuLinkPlacement, setCuLinkPlacement] = useState('description-link-1');
  
  // Custom URL - YouTube
  const [cuSelectedVideo, setCuSelectedVideo] = useState('');
  const [cuSelectedVideoData, setCuSelectedVideoData] = useState<YouTubeVideo | null>(null);
  
  // Custom URL - Email
  const [cuEmailSubject, setCuEmailSubject] = useState('');
  
  // Custom URL - Social
  const [cuSocialPlatform, setCuSocialPlatform] = useState('instagram');
  const [cuSocialContent, setCuSocialContent] = useState('');
  
  // Custom URL - General
  const [cuCampaignName, setCuCampaignName] = useState('');

  // Fetch lead magnets
  useEffect(() => {
    const fetchLeadMagnets = async () => {
      try {
        const { data, error } = await supabase
          .from('lead_magnets')
          .select('id, name, slug, landing_page_url')
          .eq('active', true)
          .order('position', { ascending: true });

        if (error) throw error;

        setLeadMagnets(data || []);
        if (data && data.length > 0) {
          setLmDestination(data[0].slug);
        }
      } catch (error) {
        console.error('Error fetching lead magnets:', error);
        toast.error('Failed to load lead magnets');
      } finally {
        setLoadingMagnets(false);
      }
    };

    fetchLeadMagnets();
  }, [supabase]);

  // Generate slug based on mode and campaign data
  const generateSlug = (mode: 'lead-magnet' | 'custom-url') => {
    // Use more precise timestamp to avoid duplicates
    const now = new Date();
    const timestamp = now.toISOString().slice(2, 10).replace(/-/g, '');
    const timeCode = now.toISOString().slice(11, 19).replace(/:/g, '').slice(0, 4); // HHMM
    
    if (mode === 'lead-magnet') {
      const magnet = leadMagnets.find(m => m.slug === lmDestination);
      const destinationSlug = magnet ? magnet.slug.split('-')[0] : 'link';
      
      switch (lmCampaignType) {
        case 'youtube':
          if (lmSelectedVideoData) {
            const placementMap: Record<string, string> = {
              'description-link-1': 'desc1',
              'description-link-2': 'desc2',
              'pinned-comment': 'pinned',
              'video-card': 'card',
            };
            const placement = placementMap[lmLinkPlacement] || 'link';
            return `yt-${lmSelectedVideoData.id}-${placement}-${destinationSlug}`;
          }
          return `yt-${timestamp}-${destinationSlug}`;
          
        case 'email':
          if (lmEmailSubject) {
            const sanitized = lmEmailSubject
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .substring(0, 20);
            return `email-${timestamp}-${sanitized}-${destinationSlug}`;
          }
          return `email-${timestamp}-${destinationSlug}`;
          
        case 'social':
          return `${lmSocialPlatform}-${timestamp}-${destinationSlug}`;
          
        case 'general':
          if (lmCampaignName) {
            const sanitized = lmCampaignName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .substring(0, 25);
            return `${sanitized}-${destinationSlug}`;
          }
          return `campaign-${timestamp}-${destinationSlug}`;
      }
    } else {
      // Custom URL mode
      // Extract domain or use description for slug
      let destinationSlug = 'external';
      try {
        const url = new URL(cuDestinationUrl);
        destinationSlug = url.hostname.replace('www.', '').split('.')[0].substring(0, 15);
      } catch {
        destinationSlug = 'external';
      }
      
      switch (cuCampaignType) {
        case 'youtube':
          if (cuSelectedVideoData) {
            const placementMap: Record<string, string> = {
              'description-link-1': 'desc1',
              'description-link-2': 'desc2',
              'pinned-comment': 'pinned',
              'video-card': 'card',
            };
            const placement = placementMap[cuLinkPlacement] || 'link';
            return `yt-${cuSelectedVideoData.id}-${placement}-${destinationSlug}`;
          }
          return `yt-${timestamp}-${destinationSlug}`;
          
        case 'email':
          if (cuEmailSubject) {
            const sanitized = cuEmailSubject
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .substring(0, 20);
            return `email-${timestamp}-${sanitized}-${destinationSlug}`;
          }
          return `email-${timestamp}-${destinationSlug}`;
          
        case 'social':
          return `${cuSocialPlatform}-${timestamp}-${destinationSlug}`;
          
        case 'general':
          if (cuCampaignName) {
            const sanitized = cuCampaignName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .substring(0, 25);
            return `${sanitized}-${destinationSlug}`;
          }
          return `campaign-${timestamp}-${destinationSlug}`;
      }
    }
    
    return `link-${timestamp}`;
  };

  // Generate UTM parameters based on mode and campaign
  const generateUTMParams = (mode: 'lead-magnet' | 'custom-url') => {
    const campaignType = mode === 'lead-magnet' ? lmCampaignType : cuCampaignType;
    const linkPlacement = mode === 'lead-magnet' ? lmLinkPlacement : cuLinkPlacement;
    
    const baseParams = {
      utm_content: linkPlacement,
    };

    switch (campaignType) {
      case 'youtube':
        const videoData = mode === 'lead-magnet' ? lmSelectedVideoData : cuSelectedVideoData;
        return {
          ...baseParams,
          utm_source: 'youtube',
          utm_medium: 'video',
          utm_campaign: videoData ? `yt-${videoData.id}` : 'youtube-campaign',
        };
        
      case 'email':
        const emailSubject = mode === 'lead-magnet' ? lmEmailSubject : cuEmailSubject;
        return {
          ...baseParams,
          utm_source: 'newsletter',
          utm_medium: 'email',
          utm_campaign: emailSubject ? 
            `email-${emailSubject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : 
            'email-campaign',
        };
        
      case 'social':
        const socialPlatform = mode === 'lead-magnet' ? lmSocialPlatform : cuSocialPlatform;
        const socialContent = mode === 'lead-magnet' ? lmSocialContent : cuSocialContent;
        return {
          ...baseParams,
          utm_source: socialPlatform,
          utm_medium: 'social',
          utm_campaign: socialContent ? 
            `${socialPlatform}-${socialContent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : 
            `${socialPlatform}-campaign`,
        };
        
      case 'general':
        const campaignName = mode === 'lead-magnet' ? lmCampaignName : cuCampaignName;
        return {
          ...baseParams,
          utm_source: 'website',
          utm_medium: 'referral',
          utm_campaign: campaignName ? 
            campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 
            'general-campaign',
        };
        
      default:
        return baseParams;
    }
  };

  // Generate metadata for the link
  const generateMetadata = (mode: 'lead-magnet' | 'custom-url') => {
    const campaignType = mode === 'lead-magnet' ? lmCampaignType : cuCampaignType;
    
    switch (campaignType) {
      case 'youtube':
        const videoData = mode === 'lead-magnet' ? lmSelectedVideoData : cuSelectedVideoData;
        return videoData ? {
          description: `YouTube: ${videoData.title}`,
          video_id: videoData.id,
          video_title: videoData.title,
          campaign_type: 'youtube',
          link_mode: mode,
        } : { campaign_type: 'youtube', link_mode: mode };
        
      case 'email':
        const emailSubject = mode === 'lead-magnet' ? lmEmailSubject : cuEmailSubject;
        return {
          description: `Email: ${emailSubject || 'Newsletter Campaign'}`,
          email_subject: emailSubject,
          campaign_type: 'email',
          link_mode: mode,
        };
        
      case 'social':
        const socialPlatform = mode === 'lead-magnet' ? lmSocialPlatform : cuSocialPlatform;
        const socialContent = mode === 'lead-magnet' ? lmSocialContent : cuSocialContent;
        return {
          description: `${socialPlatform}: ${socialContent || 'Social Campaign'}`,
          social_platform: socialPlatform,
          social_content: socialContent,
          campaign_type: 'social',
          link_mode: mode,
        };
        
      case 'general':
        const campaignName = mode === 'lead-magnet' ? lmCampaignName : cuCampaignName;
        return {
          description: `Campaign: ${campaignName || 'General Campaign'}`,
          campaign_name: campaignName,
          campaign_type: 'general',
          link_mode: mode,
        };
        
      default:
        return { campaign_type: campaignType, link_mode: mode };
    }
  };

  // Validate form based on mode
  const validateForm = () => {
    if (linkMode === 'lead-magnet') {
      switch (lmCampaignType) {
        case 'youtube':
          if (!lmSelectedVideoData) {
            toast.error('Please select a YouTube video');
            return false;
          }
          break;
        case 'email':
          if (!lmEmailSubject.trim()) {
            toast.error('Please enter an email subject');
            return false;
          }
          break;
        case 'general':
          if (!lmCampaignName.trim()) {
            toast.error('Please enter a campaign name');
            return false;
          }
          break;
      }
      
      if (!lmDestination) {
        toast.error('Please select a destination');
        return false;
      }
    } else {
      // Custom URL validation
      if (!cuDestinationUrl.trim()) {
        toast.error('Please enter a destination URL');
        return false;
      }
      
      // Validate URL format
      try {
        new URL(cuDestinationUrl);
      } catch {
        toast.error('Please enter a valid URL');
        return false;
      }
      
      switch (cuCampaignType) {
        case 'youtube':
          if (!cuSelectedVideoData) {
            toast.error('Please select a YouTube video');
            return false;
          }
          break;
        case 'email':
          if (!cuEmailSubject.trim()) {
            toast.error('Please enter an email subject');
            return false;
          }
          break;
        case 'general':
          if (!cuCampaignName.trim()) {
            toast.error('Please enter a campaign name');
            return false;
          }
          break;
      }
    }
    
    return true;
  };

  // Create the link
  const createLink = async () => {
    const slug = generateSlug(linkMode);
    const utmParams = generateUTMParams(linkMode);
    const metadata = generateMetadata(linkMode);
    
    let destinationUrl: string;
    let linkType: string;
    
    if (linkMode === 'lead-magnet') {
      const magnet = leadMagnets.find(m => m.slug === lmDestination);
      destinationUrl = magnet ? magnet.landing_page_url : '/';
      linkType = 'lead-magnet';
    } else {
      destinationUrl = cuDestinationUrl;
      linkType = 'external';
    }

    const requestBody = {
      slug,
      destination_url: destinationUrl,
      type: linkType,
      campaign: utmParams.utm_campaign,
      ...utmParams,
      append_utms: true,
      active: true,
      metadata,
    };

    console.log('Creating link with data:', requestBody);

    const response = await fetch('/api/admin/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      throw new Error(error.error || 'Failed to create link');
    }

    return await response.json();
  };

  // Handle form submission
  const handleGenerate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const link = await createLink();
      const fullUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://machinesformakers.com'}/go/${link.slug}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Link created and copied to clipboard!');

      // Reset form
      resetForm();

      // Refresh parent component
      onLinkCreated();

    } catch (error: any) {
      console.error('Error creating link:', error);
      console.error('Error details:', error.stack);
      toast.error(error.message || 'Failed to create link');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    // Reset Lead Magnet fields
    setLmSelectedVideo('');
    setLmSelectedVideoData(null);
    setLmEmailSubject('');
    setLmSocialContent('');
    setLmCampaignName('');
    
    // Reset Custom URL fields
    setCuDestinationUrl('');
    setCuSelectedVideo('');
    setCuSelectedVideoData(null);
    setCuEmailSubject('');
    setCuSocialContent('');
    setCuCampaignName('');
  };

  // Render campaign fields for Lead Magnet mode
  const renderLeadMagnetCampaignFields = () => {
    const currentType = campaignTypes[lmCampaignType as keyof typeof campaignTypes];
    
    return (
      <>
        {lmCampaignType === 'youtube' && (
          <YouTubeVideoSelectorEnhanced
            value={lmSelectedVideo}
            onValueChange={setLmSelectedVideo}
            onVideoSelect={setLmSelectedVideoData}
          />
        )}

        {lmCampaignType === 'email' && (
          <div>
            <Label>Email Subject</Label>
            <Input
              placeholder="Enter email subject line..."
              value={lmEmailSubject}
              onChange={(e) => setLmEmailSubject(e.target.value)}
            />
          </div>
        )}

        {lmCampaignType === 'social' && (
          <>
            <div>
              <Label>Platform</Label>
              <Select value={lmSocialPlatform} onValueChange={setLmSocialPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content Description (optional)</Label>
              <Input
                placeholder="Post description..."
                value={lmSocialContent}
                onChange={(e) => setLmSocialContent(e.target.value)}
              />
            </div>
          </>
        )}

        {lmCampaignType === 'general' && (
          <div>
            <Label>Campaign Name</Label>
            <Input
              placeholder="Enter campaign name..."
              value={lmCampaignName}
              onChange={(e) => setLmCampaignName(e.target.value)}
            />
          </div>
        )}

        <div>
          <Label>Link Placement</Label>
          <Select value={lmLinkPlacement} onValueChange={setLmLinkPlacement}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentType.contentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Destination</Label>
          <Select 
            value={lmDestination} 
            onValueChange={setLmDestination}
            disabled={loadingMagnets || leadMagnets.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingMagnets ? "Loading..." : "Select destination"} />
            </SelectTrigger>
            <SelectContent>
              {leadMagnets.map((magnet) => (
                <SelectItem key={magnet.id} value={magnet.slug}>
                  → {magnet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </>
    );
  };

  // Render campaign fields for Custom URL mode
  const renderCustomUrlCampaignFields = () => {
    const currentType = campaignTypes[cuCampaignType as keyof typeof campaignTypes];
    
    return (
      <>
        {cuCampaignType === 'youtube' && (
          <YouTubeVideoSelectorEnhanced
            value={cuSelectedVideo}
            onValueChange={setCuSelectedVideo}
            onVideoSelect={setCuSelectedVideoData}
          />
        )}

        {cuCampaignType === 'email' && (
          <div>
            <Label>Email Subject</Label>
            <Input
              placeholder="Enter email subject line..."
              value={cuEmailSubject}
              onChange={(e) => setCuEmailSubject(e.target.value)}
            />
          </div>
        )}

        {cuCampaignType === 'social' && (
          <>
            <div>
              <Label>Platform</Label>
              <Select value={cuSocialPlatform} onValueChange={setCuSocialPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content Description (optional)</Label>
              <Input
                placeholder="Post description..."
                value={cuSocialContent}
                onChange={(e) => setCuSocialContent(e.target.value)}
              />
            </div>
          </>
        )}

        {cuCampaignType === 'general' && (
          <div>
            <Label>Campaign Name</Label>
            <Input
              placeholder="Enter campaign name..."
              value={cuCampaignName}
              onChange={(e) => setCuCampaignName(e.target.value)}
            />
          </div>
        )}

        <div>
          <Label>Link Placement</Label>
          <Select value={cuLinkPlacement} onValueChange={setCuLinkPlacement}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentType.contentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Destination URL</Label>
          <Input
            placeholder="https://example.com/product"
            value={cuDestinationUrl}
            onChange={(e) => setCuDestinationUrl(e.target.value)}
            className="font-mono"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Enter any URL - Amazon, affiliate links, tools, etc.
          </p>
        </div>
      </>
    );
  };

  // Get preview slug
  const getPreviewSlug = () => {
    try {
      return generateSlug(linkMode);
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">🚀 Quick Create</h2>
        <p className="text-sm text-gray-600 mt-1">
          Create trackable short links for any destination
        </p>
      </div>

      <Tabs value={linkMode} onValueChange={(val) => setLinkMode(val as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lead-magnet" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Lead Magnets
          </TabsTrigger>
          <TabsTrigger value="custom-url" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Custom URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lead-magnet" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Campaign Type</Label>
            <Select value={lmCampaignType} onValueChange={(val) => {
              setLmCampaignType(val);
              setLmLinkPlacement(campaignTypes[val as keyof typeof campaignTypes].contentOptions[0]?.value || '');
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">🎥 YouTube</SelectItem>
                <SelectItem value="email">📧 Email</SelectItem>
                <SelectItem value="social">📱 Social</SelectItem>
                <SelectItem value="general">🔗 General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {renderLeadMagnetCampaignFields()}
        </TabsContent>

        <TabsContent value="custom-url" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Campaign Type</Label>
            <Select value={cuCampaignType} onValueChange={(val) => {
              setCuCampaignType(val);
              setCuLinkPlacement(campaignTypes[val as keyof typeof campaignTypes].contentOptions[0]?.value || '');
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">🎥 YouTube</SelectItem>
                <SelectItem value="email">📧 Email</SelectItem>
                <SelectItem value="social">📱 Social</SelectItem>
                <SelectItem value="general">🔗 General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {renderCustomUrlCampaignFields()}
        </TabsContent>
      </Tabs>

      {/* Preview and Generate */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {getPreviewSlug() && (
            <span>Preview: <code className="bg-gray-100 px-2 py-1 rounded">/go/{getPreviewSlug()}</code></span>
          )}
        </div>
        
        <Button 
          onClick={handleGenerate}
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Generate & Copy
            </>
          )}
        </Button>
      </div>
    </div>
  );
}