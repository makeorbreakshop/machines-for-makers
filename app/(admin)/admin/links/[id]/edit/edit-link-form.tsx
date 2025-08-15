'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DestinationSelector } from '@/components/admin/links/destination-selector';

interface LinkData {
  id: string;
  slug: string;
  destination_url: string;
  type: string;
  campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  append_utms: boolean;
  active: boolean;
  metadata?: { description?: string };
}

interface EditLinkFormProps {
  link: LinkData;
}

export function EditLinkForm({ link }: EditLinkFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    slug: link.slug || '',
    destination_url: link.destination_url || '',
    type: link.type || 'lead-magnet',
    campaign: link.campaign || '',
    utm_source: link.utm_source || 'shortlink',
    utm_medium: link.utm_medium || 'redirect',
    utm_campaign: link.utm_campaign || '',
    utm_term: link.utm_term || '',
    utm_content: link.utm_content || '',
    append_utms: link.append_utms !== false,
    active: link.active !== false,
    description: link.metadata?.description || '',
  });

  const [previewUrl, setPreviewUrl] = useState('');

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update preview
    if (field === 'slug' || field.startsWith('utm_')) {
      updatePreview({ ...formData, [field]: value });
    }
  };

  const updatePreview = (data: typeof formData) => {
    if (!data.slug) {
      setPreviewUrl('');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://machinesformakers.com';
    let preview = `${baseUrl}/go/${data.slug}`;
    
    if (data.append_utms) {
      const utmParams = [];
      if (data.utm_source) utmParams.push(`utm_source=${data.utm_source}`);
      if (data.utm_medium) utmParams.push(`utm_medium=${data.utm_medium}`);
      if (data.utm_campaign) utmParams.push(`utm_campaign=${data.utm_campaign}`);
      if (data.utm_term) utmParams.push(`utm_term=${data.utm_term}`);
      if (data.utm_content) utmParams.push(`utm_content=${data.utm_content}`);
      
      if (utmParams.length > 0) {
        preview += '?' + utmParams.join('&');
      }
    }
    
    setPreviewUrl(preview);
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const validateSlug = async (slug: string) => {
    if (!slug || slug === link.slug) return true;
    
    try {
      const response = await fetch(`/api/admin/links/validate-slug?slug=${slug}`);
      const data = await response.json();
      return data.available;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.slug || !formData.destination_url) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setIsLoading(true);

    try {
      // Check if slug is available (if changed)
      if (formData.slug !== link.slug) {
        const isAvailable = await validateSlug(formData.slug);
        if (!isAvailable) {
          toast.error('This slug is already taken');
          setIsLoading(false);
          return;
        }
      }

      // Update the link
      const response = await fetch(`/api/admin/links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          metadata: formData.description ? { description: formData.description } : {},
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update link');
      }

      toast.success('Short link updated successfully!');
      router.push(`/admin/links/${link.id}`);
    } catch (error) {
      console.error('Error updating link:', error);
      toast.error('Failed to update link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize preview on component mount
  React.useEffect(() => {
    updatePreview(formData);
  }, [formData]);

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <Link href={`/admin/links/${link.id}`} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Analytics
          </Link>
          <CardTitle>Edit Link Details</CardTitle>
          <CardDescription>Update your short link and tracking parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="slug">Short Link Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => updateFormData('slug', slugify(e.target.value))}
                placeholder="my-awesome-link"
                required
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">/go/{formData.slug || 'your-slug'}</p>
            </div>

            <div>
              <Label htmlFor="destination">Destination URL *</Label>
              <DestinationSelector
                value={formData.destination_url}
                onChange={(value) => updateFormData('destination_url', value)}
                placeholder="Select or enter destination URL"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Link Type</Label>
                <Select value={formData.type} onValueChange={(value) => updateFormData('type', value)}>
                  <SelectTrigger id="type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead-magnet">Lead Magnet</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="campaign">Campaign</Label>
                <Input
                  id="campaign"
                  value={formData.campaign}
                  onChange={(e) => updateFormData('campaign', e.target.value)}
                  placeholder="summer-sale"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Internal notes about this link..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          {/* UTM Parameters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">UTM Parameters</h3>
                <p className="text-sm text-gray-500">Automatically append tracking parameters</p>
              </div>
              <Switch
                checked={formData.append_utms}
                onCheckedChange={(checked) => updateFormData('append_utms', checked)}
              />
            </div>

            {formData.append_utms && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <Label htmlFor="utm_source">UTM Source</Label>
                  <Input
                    id="utm_source"
                    value={formData.utm_source}
                    onChange={(e) => updateFormData('utm_source', e.target.value)}
                    placeholder="shortlink"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="utm_medium">UTM Medium</Label>
                  <Input
                    id="utm_medium"
                    value={formData.utm_medium}
                    onChange={(e) => updateFormData('utm_medium', e.target.value)}
                    placeholder="redirect"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="utm_campaign">UTM Campaign</Label>
                  <Input
                    id="utm_campaign"
                    value={formData.utm_campaign}
                    onChange={(e) => updateFormData('utm_campaign', e.target.value)}
                    placeholder="product-launch"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="utm_term">UTM Term</Label>
                  <Input
                    id="utm_term"
                    value={formData.utm_term}
                    onChange={(e) => updateFormData('utm_term', e.target.value)}
                    placeholder="optional"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="utm_content">UTM Content</Label>
                  <Input
                    id="utm_content"
                    value={formData.utm_content}
                    onChange={(e) => updateFormData('utm_content', e.target.value)}
                    placeholder="optional"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Preview</h3>
              <div className="flex items-start gap-2">
                <LinkIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                <code className="text-sm break-all">{previewUrl}</code>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="active">Active</Label>
              <p className="text-sm text-gray-500">Link will redirect when active</p>
            </div>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => updateFormData('active', checked)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push(`/admin/links/${link.id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Link
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}