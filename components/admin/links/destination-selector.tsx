'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Check, ExternalLink, FileText, Tag, Home, ShoppingBag, Wrench, BookOpen, Search, Box, Gift, Package, Star, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Destination {
  url: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  category?: string;
}

interface LeadMagnet {
  id: string;
  name: string;
  landing_page_url: string;
  description: string | null;
  icon: string;
  active: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'book-open': <BookOpen className="h-4 w-4" />,
  'tag': <Tag className="h-4 w-4" />,
  'gift': <Gift className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
  'package': <Package className="h-4 w-4" />,
  'star': <Star className="h-4 w-4" />,
  'zap': <Zap className="h-4 w-4" />,
  'target': <Target className="h-4 w-4" />,
};

const STATIC_DESTINATIONS: Destination[] = [
  // Main Pages
  {
    url: '/',
    title: 'Homepage',
    description: 'Main landing page',
    icon: <Home className="h-4 w-4" />,
    category: 'Main Pages',
  },
  {
    url: '/products',
    title: 'All Products',
    description: 'Browse all machines',
    icon: <ShoppingBag className="h-4 w-4" />,
    category: 'Main Pages',
  },
  {
    url: '/category/laser-cutters',
    title: 'Laser Cutters',
    description: 'Browse laser cutting machines',
    icon: <Wrench className="h-4 w-4" />,
    category: 'Categories',
  },
  {
    url: '/category/3d-printers',
    title: '3D Printers',
    description: 'Browse 3D printing machines',
    icon: <Box className="h-4 w-4" />,
    category: 'Categories',
  },
  {
    url: '/category/cnc-machines',
    title: 'CNC Machines',
    description: 'Browse CNC machines',
    icon: <Wrench className="h-4 w-4" />,
    category: 'Categories',
  },
  // Tools
  {
    url: '/tools/ink-calculator',
    title: 'Ink Cost Calculator',
    description: 'Calculate printing costs',
    icon: <FileText className="h-4 w-4" />,
    category: 'Tools',
  },
  {
    url: '/tools/machine-finder',
    title: 'Machine Finder Quiz',
    description: 'Find the perfect machine',
    icon: <Search className="h-4 w-4" />,
    category: 'Tools',
  },
];

interface DestinationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showCustomInput?: boolean;
}

export function DestinationSelector({
  value,
  onChange,
  placeholder = 'Select or enter destination URL',
  showCustomInput = true,
}: DestinationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState(value || '');
  const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch lead magnets from the database
    const fetchLeadMagnets = async () => {
      try {
        const response = await fetch('/api/admin/lead-magnets');
        if (response.ok) {
          const data = await response.json();
          setLeadMagnets(data.leadMagnets.filter((m: LeadMagnet) => m.active));
        }
      } catch (error) {
        console.error('Failed to fetch lead magnets:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeadMagnets();
  }, []);

  // Combine lead magnets with static destinations
  const allDestinations: Destination[] = [
    ...leadMagnets.map(magnet => ({
      url: magnet.landing_page_url,
      title: magnet.name,
      description: magnet.description || undefined,
      icon: iconMap[magnet.icon] || <Gift className="h-4 w-4" />,
      category: 'Lead Magnets',
    })),
    ...STATIC_DESTINATIONS,
  ];

  const selectedDestination = allDestinations.find(d => d.url === value);

  const handleSelect = (destination: Destination) => {
    onChange(destination.url);
    setCustomUrl(destination.url);
    setShowCustom(false);
    setOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customUrl) {
      onChange(customUrl);
      setShowCustom(true);
      setOpen(false);
    }
  };

  const groupedDestinations = allDestinations.reduce((acc, dest) => {
    const category = dest.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(dest);
    return acc;
  }, {} as Record<string, Destination[]>);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedDestination ? (
            <div className="flex items-center gap-2">
              {selectedDestination.icon}
              <span>{selectedDestination.title}</span>
            </div>
          ) : value ? (
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <span className="truncate">{value}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search popular pages..." />
          <CommandEmpty>
            {showCustomInput ? (
              <div className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">No pages found.</p>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter custom URL..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCustomSubmit();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleCustomSubmit}
                    disabled={!customUrl}
                    className="w-full"
                  >
                    Use Custom URL
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">No pages found.</p>
            )}
          </CommandEmpty>
          {Object.entries(groupedDestinations).map(([category, destinations]) => (
            <CommandGroup key={category} heading={category}>
              {destinations.map((destination) => (
                <CommandItem
                  key={destination.url}
                  value={destination.title}
                  onSelect={() => handleSelect(destination)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {destination.icon}
                    <div className="flex-1">
                      <div className="font-medium">{destination.title}</div>
                      {destination.description && (
                        <div className="text-sm text-muted-foreground">
                          {destination.description}
                        </div>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === destination.url ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          {showCustomInput && (
            <CommandGroup heading="Custom URL">
              <div className="p-2">
                <div className="space-y-2">
                  <Input
                    placeholder="https://example.com or /relative-path"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomSubmit();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleCustomSubmit}
                    disabled={!customUrl}
                    className="w-full"
                  >
                    Use This URL
                  </Button>
                </div>
              </div>
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}