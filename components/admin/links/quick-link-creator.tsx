'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Copy, Loader2 } from 'lucide-react';
import { YouTubeVideoSelector } from '@/components/admin/analytics/youtube-video-selector';

interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
  description?: string;
}

interface QuickLinkCreatorProps {
  onLinkCreated: () => void; // Callback to refresh the links list
}

export function QuickLinkCreator({ onLinkCreated }: QuickLinkCreatorProps) {
  // Campaign type and common fields
  const [campaignType, setCampaignType] = useState('youtube');
  const [leadMagnet, setLeadMagnet] = useState('material-library');
  const [linkPlacement, setLinkPlacement] = useState('description-link-1');
  const [isLoading, setIsLoading] = useState(false);

  // YouTube specific
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedVideoData, setSelectedVideoData] = useState<YouTubeVideo | null>(null);
  
  // Email specific
  const [emailSubject, setEmailSubject] = useState('');
  
  // Social specific
  const [socialPlatform, setSocialPlatform] = useState('instagram');
  const [socialContent, setSocialContent] = useState('');
  
  // General campaign
  const [campaignName, setCampaignName] = useState('');

  // Campaign type definitions matching UTM builder
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
      source: '', // User defined
      medium: '', // User defined
      contentOptions: [
        { value: 'cta-button', label: 'CTA Button' },
        { value: 'inline-link', label: 'Inline Text Link' },
        { value: 'banner', label: 'Banner/Ad' },
        { value: 'footer', label: 'Footer Link' },
      ]
    }
  };

  const currentCampaignType = campaignTypes[campaignType as keyof typeof campaignTypes];

  const generateSlug = (destination: string) => {
    const destinationSlug = destination === 'material-library' ? 'material' : 'deals';
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD format
    
    switch (campaignType) {
      case 'youtube':
        if (selectedVideoData) {
          // Format: yt-{videoId}-{destination}
          return `yt-${selectedVideoData.id}-${destinationSlug}`;
        }
        return `yt-${timestamp}-${destinationSlug}`;
        
      case 'email':
        if (emailSubject) {
          // Format: email-{YYMMDD}-{subject}-{destination}
          const sanitizedSubject = emailSubject
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 20); // Shorter for better URLs
          return `email-${timestamp}-${sanitizedSubject}-${destinationSlug}`;
        }
        return `email-${timestamp}-${destinationSlug}`;
        
      case 'social':
        // Format: {platform}-{content?}-{destination}
        if (socialContent) {
          const sanitizedContent = socialContent
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 15);
          return `${socialPlatform}-${sanitizedContent}-${destinationSlug}`;
        }
        return `${socialPlatform}-${timestamp}-${destinationSlug}`;
        
      case 'general':
        if (campaignName) {
          // Format: {campaign}-{destination}
          const sanitizedName = campaignName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 25);
          return `${sanitizedName}-${destinationSlug}`;
        }
        return `campaign-${timestamp}-${destinationSlug}`;
        
      default:
        return `link-${timestamp}-${destinationSlug}`;
    }
  };

  const generateUTMParams = () => {
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
          utm_campaign: socialContent ? `${socialPlatform}-${socialContent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : `${socialPlatform}-campaign`,
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

  const getDestinationUrl = (magnet: string) => {
    return magnet === 'material-library' ? '/laser-material-library' : '/deals';
  };

  const createLink = async (destination: string) => {
    const slug = generateSlug(destination);
    const utmParams = generateUTMParams();
    
    // Generate metadata based on campaign type
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
        destination_url: getDestinationUrl(destination),
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const validateForm = () => {
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
      case 'social':
        // Social platform is always set, content is optional
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

  const handleGenerate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const linksToCreate = leadMagnet === 'both' 
        ? ['material-library', 'deal-alerts']
        : [leadMagnet];

      const createdLinks = [];

      for (const destination of linksToCreate) {
        const link = await createLink(destination);
        const fullUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://machinesformakers.com'}/go/${link.slug}`;
        createdLinks.push({ ...link, fullUrl, destination });
      }

      // Copy the first link to clipboard automatically
      await copyToClipboard(createdLinks[0].fullUrl);
      
      // Show success message
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
    setLeadMagnet('material-library');
    setLinkPlacement(currentCampaignType.contentOptions[0]?.value || '');
    
    // Reset campaign-specific fields
    setSelectedVideo('');
    setSelectedVideoData(null);
    setEmailSubject('');
    setSocialContent('');
    setCampaignName('');
  };

  // Update placement options when campaign type changes
  const handleCampaignTypeChange = (newType: string) => {
    setCampaignType(newType);
    const newCampaignType = campaignTypes[newType as keyof typeof campaignTypes];
    setLinkPlacement(newCampaignType.contentOptions[0]?.value || '');
    resetForm();
  };

  const getCampaignTypeLabel = () => {
    switch (campaignType) {
      case 'youtube': return '🎥 YouTube Video';
      case 'email': return '📧 Email Campaign';
      case 'social': return '📱 Social Media';
      case 'general': return '🔗 General Campaign';
      default: return 'Campaign';
    }
  };

  const renderCampaignFields = () => {
    switch (campaignType) {
      case 'youtube':
        return (
          <div className="flex-1 min-w-[300px]">
            <YouTubeVideoSelector
              value={selectedVideo}
              onValueChange={setSelectedVideo}
              onVideoSelect={(video) => setSelectedVideoData(video)}
            />
          </div>
        );

      case 'email':
        return (
          <div className="flex-1 min-w-[300px]">
            <Input
              placeholder="Enter email subject line..."
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>
        );

      case 'social':
        return (
          <>
            <div className="min-w-[150px]">
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
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Post description (optional)..."
                value={socialContent}
                onChange={(e) => setSocialContent(e.target.value)}
              />
            </div>
          </>
        );

      case 'general':
        return (
          <div className="flex-1 min-w-[300px]">
            <Input
              placeholder="Enter campaign name..."
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getPreviewSlug = () => {
    const destination = leadMagnet === 'both' ? 'material-library' : leadMagnet;
    return generateSlug(destination);
  };

  const shouldShowPreview = () => {
    switch (campaignType) {
      case 'youtube': return !!selectedVideoData;
      case 'email': return !!emailSubject.trim();
      case 'social': return true; // Always show for social since platform is always set
      case 'general': return !!campaignName.trim();
      default: return false;
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-blue-900">
          🚀 Quick Create: {getCampaignTypeLabel()}
        </h3>
        
        {/* Campaign Type Selector */}
        <Select value={campaignType} onValueChange={handleCampaignTypeChange}>
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
      
      <div className="flex flex-wrap gap-3 items-end">
        {/* Campaign-specific fields */}
        {renderCampaignFields()}

        {/* Link Placement */}
        <div className="min-w-[200px]">
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

        {/* Lead Magnet */}
        <div className="min-w-[200px]">
          <Select value={leadMagnet} onValueChange={setLeadMagnet}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="material-library">→ Material Library</SelectItem>
              <SelectItem value="deal-alerts">→ Deal Alerts</SelectItem>
              <SelectItem value="both">→ Both Lead Magnets</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate}
          disabled={isLoading}
          className="min-w-[140px]"
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

      {/* Preview */}
      {shouldShowPreview() && (
        <div className="mt-3 text-sm text-gray-600">
          <strong>Preview:</strong> /go/{getPreviewSlug()}
          {leadMagnet === 'both' && ' (+ deal alerts version)'}
        </div>
      )}
    </div>
  );
}