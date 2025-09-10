'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Copy, Loader2, Link, Youtube, Globe, AlertCircle } from 'lucide-react';
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

export function QuickLinkCreatorEnhanced({ onLinkCreated }: QuickLinkCreatorProps) {
  // Core state
  const [linkMode, setLinkMode] = useState<'lead-magnet' | 'custom-url'>('lead-magnet');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  // Lead Magnet Mode
  const [campaignType, setCampaignType] = useState('youtube');
  const [leadMagnet, setLeadMagnet] = useState('');
  const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>([]);
  const [loadingMagnets, setLoadingMagnets] = useState(true);
  const [linkPlacement, setLinkPlacement] = useState('description-link-1');
  
  // YouTube specific (Lead Magnet mode)
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedVideoData, setSelectedVideoData] = useState<YouTubeVideo | null>(null);
  
  // Email specific
  const [emailSubject, setEmailSubject] = useState('');
  
  // Social specific
  const [socialPlatform, setSocialPlatform] = useState('instagram');
  const [socialContent, setSocialContent] = useState('');
  
  // General campaign
  const [campaignName, setCampaignName] = useState('');

  // Custom URL Mode - mirrors Lead Magnet mode but with custom destination
  const [customCampaignType, setCustomCampaignType] = useState('youtube');
  const [customUrl, setCustomUrl] = useState('');
  const [customLinkPlacement, setCustomLinkPlacement] = useState('description-link-1');
  
  // Custom URL - YouTube specific
  const [customSelectedVideo, setCustomSelectedVideo] = useState('');
  const [customSelectedVideoData, setCustomSelectedVideoData] = useState<YouTubeVideo | null>(null);
  
  // Custom URL - Email specific
  const [customEmailSubject, setCustomEmailSubject] = useState('');
  
  // Custom URL - Social specific
  const [customSocialPlatform, setCustomSocialPlatform] = useState('instagram');
  const [customSocialContent, setCustomSocialContent] = useState('');
  
  // Custom URL - General campaign
  const [customCampaignName, setCustomCampaignName] = useState('');

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
          setLeadMagnet(data[0].slug);
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

  // Campaign type definitions
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
      source: '',
      medium: 'social',
      contentOptions: [
        { value: 'bio-link', label: 'Bio Link' },
        { value: 'post-link', label: 'Post Content Link' },
        { value: 'story-link', label: 'Story Link' },
        { value: 'dm-link', label: 'Direct Message' },
      ]
    },
    general: {
      source: '',
      medium: '',
      contentOptions: [
        { value: 'cta-button', label: 'CTA Button' },
        { value: 'inline-link', label: 'Inline Text Link' },
        { value: 'banner', label: 'Banner/Ad' },
        { value: 'footer', label: 'Footer Link' },
      ]
    }
  };

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*&v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Check if URL is YouTube and try to fetch metadata
  useEffect(() => {
    if (linkMode !== 'custom-url') return;

    const url = youtubeUrl || customUrl;
    const videoId = extractVideoId(url);
    
    if (videoId) {
      setIsYoutubeUrl(true);
      
      // Try to fetch metadata using oEmbed (works for public/unlisted videos)
      const fetchYoutubeData = async () => {
        setFetchingYoutubeData(true);
        try {
          const response = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`);
          if (response.ok) {
            const data = await response.json();
            setYoutubeTitle(data.title || '');
            
            // Auto-generate slug from video title if enabled
            if (autoGenerateSlug && data.title) {
              const slug = `yt-${videoId}-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20)}`;
              setCustomSlug(slug);
            }
          } else {
            // Video is private or oEmbed failed - user needs to enter title manually
            console.log('Could not fetch video metadata - video may be private');
          }
        } catch (error) {
          console.error('Error fetching YouTube data:', error);
        } finally {
          setFetchingYoutubeData(false);
        }
      };

      if (videoId) {
        fetchYoutubeData();
      }
    } else {
      setIsYoutubeUrl(false);
      setYoutubeTitle('');
    }
  }, [youtubeUrl, customUrl, linkMode, autoGenerateSlug]);

  // Auto-generate slug for custom URLs
  useEffect(() => {
    if (linkMode === 'custom-url' && autoGenerateSlug && !isYoutubeUrl) {
      const generateCustomSlug = () => {
        const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        
        if (customDescription) {
          return customDescription
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 30);
        }
        
        // Try to extract domain from URL
        try {
          const url = new URL(customUrl);
          const domain = url.hostname.replace('www.', '').split('.')[0];
          return `${domain}-${timestamp}`;
        } catch {
          return `link-${timestamp}`;
        }
      };
      
      setCustomSlug(generateCustomSlug());
    }
  }, [customUrl, customDescription, autoGenerateSlug, linkMode, isYoutubeUrl]);

  const generateLeadMagnetSlug = (destination: string) => {
    const magnet = leadMagnets.find(m => m.slug === destination);
    const destinationSlug = magnet ? magnet.slug.split('-')[0] : destination.substring(0, 10);
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    
    switch (campaignType) {
      case 'youtube':
        if (selectedVideoData) {
          const placementMap: Record<string, string> = {
            'description-link-1': 'desc1',
            'description-link-2': 'desc2',
            'pinned-comment': 'pinned',
            'video-card': 'card',
          };
          const placement = placementMap[linkPlacement] || 'link';
          return `yt-${selectedVideoData.id}-${placement}-${destinationSlug}`;
        }
        return `yt-${timestamp}-${destinationSlug}`;
        
      case 'email':
        if (emailSubject) {
          const sanitized = emailSubject
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 20);
          return `email-${timestamp}-${sanitized}-${destinationSlug}`;
        }
        return `email-${timestamp}-${destinationSlug}`;
        
      case 'social':
        return `${socialPlatform}-${timestamp}-${destinationSlug}`;
        
      case 'general':
        if (campaignName) {
          const sanitized = campaignName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 25);
          return `${sanitized}-${destinationSlug}`;
        }
        return `campaign-${timestamp}-${destinationSlug}`;
        
      default:
        return `link-${timestamp}-${destinationSlug}`;
    }
  };

  const generateUTMParams = () => {
    if (linkMode === 'custom-url') {
      // For custom URLs, use manually entered UTM params or defaults
      return {
        utm_source: customUtmSource || (isYoutubeUrl ? 'youtube' : 'direct'),
        utm_medium: customUtmMedium || (isYoutubeUrl ? 'video' : 'referral'),
        utm_campaign: customUtmCampaign || customSlug,
        utm_content: customUtmContent || '',
      };
    }

    // Lead magnet mode UTM generation (existing logic)
    const baseParams = {
      utm_content: linkPlacement,
    };

    switch (campaignType) {
      case 'youtube':
        return {
          ...baseParams,
          utm_source: 'youtube',
          utm_medium: 'video',
          utm_campaign: selectedVideoData ? `yt-${selectedVideoData.id}` : 'youtube-campaign',
        };
      case 'email':
        return {
          ...baseParams,
          utm_source: 'newsletter',
          utm_medium: 'email',
          utm_campaign: emailSubject ? `email-${emailSubject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : 'email-campaign',
        };
      case 'social':
        return {
          ...baseParams,
          utm_source: socialPlatform,
          utm_medium: 'social',
          utm_campaign: `${socialPlatform}-campaign`,
        };
      case 'general':
        return {
          ...baseParams,
          utm_source: 'website',
          utm_medium: 'referral',
          utm_campaign: campaignName ? campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'general-campaign',
        };
      default:
        return baseParams;
    }
  };

  const validateForm = () => {
    if (linkMode === 'custom-url') {
      const urlToUse = isYoutubeUrl && youtubeUrl ? youtubeUrl : customUrl;
      
      if (!urlToUse.trim()) {
        toast.error('Please enter a destination URL');
        return false;
      }
      
      // Validate URL format
      try {
        new URL(urlToUse);
      } catch {
        toast.error('Please enter a valid URL');
        return false;
      }
      
      if (!customSlug.trim()) {
        toast.error('Please enter a slug for your short link');
        return false;
      }
      
      // Check slug format
      if (!/^[a-z0-9-]+$/.test(customSlug)) {
        toast.error('Slug can only contain lowercase letters, numbers, and hyphens');
        return false;
      }
      
      if (isYoutubeUrl && !youtubeTitle.trim()) {
        toast.error('Please enter a title for the YouTube video');
        return false;
      }
      
      return true;
    }

    // Lead magnet validation (existing)
    switch (campaignType) {
      case 'youtube':
        if (!selectedVideoData) {
          toast.error('Please select a video');
          return false;
        }
        break;
      case 'email':
        if (!emailSubject.trim()) {
          toast.error('Please enter an email subject');
          return false;
        }
        break;
      case 'general':
        if (!campaignName.trim()) {
          toast.error('Please enter a campaign name');
          return false;
        }
        break;
    }
    return true;
  };

  const createCustomUrlLink = async () => {
    const urlToUse = isYoutubeUrl && youtubeUrl ? youtubeUrl : customUrl;
    const utmParams = generateUTMParams();
    const videoId = isYoutubeUrl ? extractVideoId(urlToUse) : null;
    
    const metadata: any = {
      description: customDescription || (isYoutubeUrl ? `YouTube: ${youtubeTitle}` : `External: ${customSlug}`),
      link_type: isYoutubeUrl ? 'youtube-external' : 'external',
    };
    
    if (isYoutubeUrl && videoId) {
      metadata.video_id = videoId;
      metadata.video_title = youtubeTitle;
    }

    const response = await fetch('/api/admin/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: customSlug,
        destination_url: urlToUse,
        type: 'external',
        campaign: utmParams.utm_campaign,
        ...utmParams,
        append_utms: true,
        active: true,
        metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create link');
    }

    return await response.json();
  };

  const createLeadMagnetLink = async (destination: string) => {
    const slug = generateLeadMagnetSlug(destination);
    const utmParams = generateUTMParams();
    const magnet = leadMagnets.find(m => m.slug === destination);
    
    const generateMetadata = () => {
      switch (campaignType) {
        case 'youtube':
          return selectedVideoData ? {
            description: `YouTube: ${selectedVideoData.title}`,
            video_id: selectedVideoData.id,
            video_title: selectedVideoData.title,
            campaign_type: 'youtube',
          } : { campaign_type: 'youtube' };
        case 'email':
          return {
            description: `Email: ${emailSubject || 'Newsletter Campaign'}`,
            email_subject: emailSubject,
            campaign_type: 'email',
          };
        case 'social':
          return {
            description: `${socialPlatform}: ${socialContent || 'Social Campaign'}`,
            social_platform: socialPlatform,
            social_content: socialContent,
            campaign_type: 'social',
          };
        case 'general':
          return {
            description: `Campaign: ${campaignName || 'General Campaign'}`,
            campaign_name: campaignName,
            campaign_type: 'general',
          };
        default:
          return { campaign_type: campaignType };
      }
    };

    const response = await fetch('/api/admin/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        destination_url: magnet ? magnet.landing_page_url : '/',
        type: 'lead-magnet',
        campaign: utmParams.utm_campaign,
        ...utmParams,
        append_utms: true,
        active: true,
        metadata: generateMetadata(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create link');
    }

    return await response.json();
  };

  const handleGenerate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      let createdLinks = [];

      if (linkMode === 'custom-url') {
        // Create single custom URL link
        const link = await createCustomUrlLink();
        const fullUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://machinesformakers.com'}/go/${link.slug}`;
        createdLinks.push({ ...link, fullUrl });
      } else {
        // Lead magnet mode (existing logic)
        const linksToCreate = leadMagnet === 'all' 
          ? leadMagnets.map(m => m.slug)
          : [leadMagnet];

        for (const destination of linksToCreate) {
          const link = await createLeadMagnetLink(destination);
          const fullUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://machinesformakers.com'}/go/${link.slug}`;
          createdLinks.push({ ...link, fullUrl, destination });
        }
      }

      // Copy the first link to clipboard
      await navigator.clipboard.writeText(createdLinks[0].fullUrl);
      
      const linkText = createdLinks.length === 1 
        ? 'Link created and copied!'
        : `${createdLinks.length} links created! First link copied.`;
      
      toast.success(linkText);

      // Reset form
      resetForm();

      // Refresh parent component
      onLinkCreated();

    } catch (error: any) {
      console.error('Error creating link:', error);
      toast.error(error.message || 'Failed to create link');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    // Reset common fields
    setLinkPlacement(campaignTypes[campaignType as keyof typeof campaignTypes].contentOptions[0]?.value || '');
    
    // Reset campaign-specific fields
    setSelectedVideo('');
    setSelectedVideoData(null);
    setEmailSubject('');
    setSocialContent('');
    setCampaignName('');
    
    // Reset custom URL fields
    setCustomUrl('');
    setCustomSlug('');
    setCustomDescription('');
    setYoutubeUrl('');
    setYoutubeTitle('');
    setCustomUtmSource('');
    setCustomUtmMedium('');
    setCustomUtmCampaign('');
    setCustomUtmContent('');
  };

  const currentCampaignType = campaignTypes[campaignType as keyof typeof campaignTypes];

  const renderLeadMagnetMode = () => (
    <div className="space-y-4">
      {/* Campaign Type Selector */}
      <div className="flex items-center justify-between">
        <Label>Campaign Type</Label>
        <Select value={campaignType} onValueChange={(val) => {
          setCampaignType(val);
          setLinkPlacement(campaignTypes[val as keyof typeof campaignTypes].contentOptions[0]?.value || '');
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

      {/* Campaign-specific fields */}
      {campaignType === 'youtube' && (
        <div>
          <Label>YouTube Video</Label>
          <YouTubeVideoSelector
            value={selectedVideo}
            onValueChange={setSelectedVideo}
            onVideoSelect={(video) => setSelectedVideoData(video)}
          />
        </div>
      )}

      {campaignType === 'email' && (
        <div>
          <Label>Email Subject</Label>
          <Input
            placeholder="Enter email subject line..."
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
        </div>
      )}

      {campaignType === 'social' && (
        <div className="space-y-3">
          <div>
            <Label>Platform</Label>
            <Select value={socialPlatform} onValueChange={setSocialPlatform}>
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
              value={socialContent}
              onChange={(e) => setSocialContent(e.target.value)}
            />
          </div>
        </div>
      )}

      {campaignType === 'general' && (
        <div>
          <Label>Campaign Name</Label>
          <Input
            placeholder="Enter campaign name..."
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />
        </div>
      )}

      {/* Link Placement */}
      <div>
        <Label>Link Placement</Label>
        <Select value={linkPlacement} onValueChange={setLinkPlacement}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currentCampaignType.contentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead Magnet Destination */}
      <div>
        <Label>Destination</Label>
        <Select 
          value={leadMagnet} 
          onValueChange={setLeadMagnet}
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
            {leadMagnets.length > 1 && (
              <SelectItem value="all">→ All Lead Magnets</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderCustomUrlMode = () => (
    <div className="space-y-4">
      {/* YouTube URL or Regular URL */}
      {isYoutubeUrl ? (
        <>
          <div>
            <Label className="flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-600" />
              YouTube URL
            </Label>
            <Input
              placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="font-mono"
            />
            {fetchingYoutubeData && (
              <p className="text-sm text-muted-foreground mt-1">Fetching video metadata...</p>
            )}
          </div>
          
          <div>
            <Label className="flex items-center gap-2">
              Video Title
              {!youtubeTitle && (
                <span className="text-amber-600 text-xs">(Required for private/unlisted videos)</span>
              )}
            </Label>
            <Input
              placeholder="Enter video title manually if it couldn't be fetched"
              value={youtubeTitle}
              onChange={(e) => setYoutubeTitle(e.target.value)}
            />
            {youtubeTitle && (
              <p className="text-sm text-green-600 mt-1">✓ Video title captured</p>
            )}
          </div>
        </>
      ) : (
        <div>
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Destination URL
          </Label>
          <Input
            placeholder="https://example.com/product or any URL..."
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="font-mono"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Paste any URL - YouTube, Amazon, affiliate links, etc.
          </p>
        </div>
      )}

      {/* Custom Slug */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Short Link Slug</Label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoGenerateSlug}
              onChange={(e) => setAutoGenerateSlug(e.target.checked)}
              className="rounded"
            />
            Auto-generate
          </label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/go/</span>
          <Input
            placeholder="my-custom-link"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            disabled={autoGenerateSlug}
            className="font-mono"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label>Description (optional)</Label>
        <Input
          placeholder="What is this link for?"
          value={customDescription}
          onChange={(e) => setCustomDescription(e.target.value)}
        />
      </div>

      {/* UTM Parameters (optional) */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">UTM Parameters (optional)</p>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Source</Label>
            <Input
              placeholder={isYoutubeUrl ? "youtube" : "e.g., newsletter"}
              value={customUtmSource}
              onChange={(e) => setCustomUtmSource(e.target.value)}
            />
          </div>
          
          <div>
            <Label className="text-xs">Medium</Label>
            <Input
              placeholder={isYoutubeUrl ? "video" : "e.g., email"}
              value={customUtmMedium}
              onChange={(e) => setCustomUtmMedium(e.target.value)}
            />
          </div>
          
          <div>
            <Label className="text-xs">Campaign</Label>
            <Input
              placeholder="e.g., summer-sale"
              value={customUtmCampaign}
              onChange={(e) => setCustomUtmCampaign(e.target.value)}
            />
          </div>
          
          <div>
            <Label className="text-xs">Content</Label>
            <Input
              placeholder="e.g., header-link"
              value={customUtmContent}
              onChange={(e) => setCustomUtmContent(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">🚀 Quick Create</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create trackable short links for any destination
          </p>
        </div>
      </div>

      <Tabs value={linkMode} onValueChange={(val) => setLinkMode(val as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lead-magnet" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Lead Magnets
          </TabsTrigger>
          <TabsTrigger value="custom-url" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Custom URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lead-magnet" className="mt-4">
          {renderLeadMagnetMode()}
        </TabsContent>

        <TabsContent value="custom-url" className="mt-4">
          {renderCustomUrlMode()}
        </TabsContent>
      </Tabs>

      {/* Generate Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {linkMode === 'custom-url' && customSlug && (
            <span>Preview: <code className="bg-gray-100 px-2 py-1 rounded">/go/{customSlug}</code></span>
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