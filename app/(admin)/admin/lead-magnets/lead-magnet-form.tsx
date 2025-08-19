'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, BookOpen, Tag, Gift, FileText, Package, Star, Zap, Target } from 'lucide-react';
import { toast } from 'sonner';

interface LeadMagnetFormData {
  name: string;
  slug: string;
  description: string;
  landing_page_url: string;
  convertkit_form_id: string;
  convertkit_form_name: string;
  convertkit_tag: string;
  icon: string;
  color: string;
  position: number;
  active: boolean;
}

interface LeadMagnetFormProps {
  initialData?: Partial<LeadMagnetFormData>;
  leadMagnetId?: string;
}

const ICON_OPTIONS = [
  { value: 'gift', label: 'Gift', icon: <Gift className="h-4 w-4" /> },
  { value: 'book-open', label: 'Book', icon: <BookOpen className="h-4 w-4" /> },
  { value: 'tag', label: 'Tag', icon: <Tag className="h-4 w-4" /> },
  { value: 'file-text', label: 'Document', icon: <FileText className="h-4 w-4" /> },
  { value: 'package', label: 'Package', icon: <Package className="h-4 w-4" /> },
  { value: 'star', label: 'Star', icon: <Star className="h-4 w-4" /> },
  { value: 'zap', label: 'Zap', icon: <Zap className="h-4 w-4" /> },
  { value: 'target', label: 'Target', icon: <Target className="h-4 w-4" /> },
];

const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#14b8a6', label: 'Teal' },
];

export function LeadMagnetForm({ initialData, leadMagnetId }: LeadMagnetFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LeadMagnetFormData>({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    landing_page_url: initialData?.landing_page_url || '/',
    convertkit_form_id: initialData?.convertkit_form_id || '',
    convertkit_form_name: initialData?.convertkit_form_name || '',
    convertkit_tag: initialData?.convertkit_tag || '',
    icon: initialData?.icon || 'gift',
    color: initialData?.color || '#3b82f6',
    position: initialData?.position || 0,
    active: initialData?.active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = leadMagnetId
        ? `/api/admin/lead-magnets/${leadMagnetId}`
        : '/api/admin/lead-magnets';
      
      const method = leadMagnetId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save lead magnet');
      }

      toast.success(leadMagnetId ? 'Lead magnet updated' : 'Lead magnet created');
      router.push('/admin/lead-magnets');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Button
        type="button"
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Configure the basic details of your lead magnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: !leadMagnetId ? generateSlug(e.target.value) : formData.slug,
                  });
                }}
                placeholder="e.g., Laser Material Library"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., material-library"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-xs text-muted-foreground">
                Used in analytics and tracking
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what users will receive"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="landing_page_url">Landing Page URL *</Label>
            <Input
              id="landing_page_url"
              value={formData.landing_page_url}
              onChange={(e) => setFormData({ ...formData, landing_page_url: e.target.value })}
              placeholder="/laser-material-library"
              required
            />
            <p className="text-xs text-muted-foreground">
              The URL where users sign up for this lead magnet
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ConvertKit Integration</CardTitle>
          <CardDescription>
            Connect this lead magnet to your ConvertKit form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Find your form ID in ConvertKit under Forms → Your Form → Settings → Form ID
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="convertkit_form_id">ConvertKit Form ID</Label>
              <Input
                id="convertkit_form_id"
                value={formData.convertkit_form_id}
                onChange={(e) => setFormData({ ...formData, convertkit_form_id: e.target.value })}
                placeholder="e.g., 4949475"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="convertkit_form_name">Form Name</Label>
              <Input
                id="convertkit_form_name"
                value={formData.convertkit_form_name}
                onChange={(e) => setFormData({ ...formData, convertkit_form_name: e.target.value })}
                placeholder="e.g., Laser Material Library"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="convertkit_tag">Primary Tag</Label>
            <Input
              id="convertkit_tag"
              value={formData.convertkit_tag}
              onChange={(e) => setFormData({ ...formData, convertkit_tag: e.target.value })}
              placeholder="e.g., laser-material-library"
            />
            <p className="text-xs text-muted-foreground">
              Main tag applied to subscribers in ConvertKit
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>
            Customize how this lead magnet appears in the admin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded"
                          style={{ backgroundColor: option.value }}
                        />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Sort Order</Label>
              <Input
                id="position"
                type="number"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/lead-magnets')}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : leadMagnetId ? 'Update Lead Magnet' : 'Create Lead Magnet'}
        </Button>
      </div>
    </form>
  );
}