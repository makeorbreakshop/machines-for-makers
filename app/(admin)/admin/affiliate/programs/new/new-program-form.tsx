"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  brand_id: z.string().uuid('Please select a brand'),
  commission_rate: z.number().min(0.001, 'Commission rate must be greater than 0').max(1, 'Commission rate cannot exceed 100%'),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Brand {
  id: string;
  Name: string;
  Slug: string;
}

interface NewProgramFormProps {
  brands: Brand[];
}

export function NewProgramForm({ brands }: NewProgramFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      brand_id: '',
      commission_rate: 0.05, // 5% default
      is_active: true,
      notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/affiliate/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create program');
      }

      toast({
        title: 'Success',
        description: 'Affiliate program created successfully',
      });

      router.push('/admin/affiliate/programs');
      router.refresh();
    } catch (error) {
      console.error('Error creating program:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create program',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link href="/admin/affiliate/programs">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Button>
        </Link>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Program Details</CardTitle>
              <CardDescription>
                Configure the basic settings for this affiliate program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. xTool Affiliate Program" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this affiliate program
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.Name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The brand this program tracks sales for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="commission_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100"
                          placeholder="5.00"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) / 100; // Convert percentage to decimal
                            field.onChange(value);
                          }}
                          value={field.value ? (field.value * 100).toString() : ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Commission percentage (e.g., 5.00 for 5%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Program</FormLabel>
                        <FormDescription>
                          Enable this program to start tracking sales
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes about this program..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Internal notes about this affiliate program
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* CSV Configuration will be added later */}
          <Card>
            <CardHeader>
              <CardTitle>CSV Import Settings</CardTitle>
              <CardDescription>
                Configure how CSV files from this affiliate program should be processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  CSV column mapping will be configured after the program is created.
                  <br />
                  You can set this up when importing your first CSV file.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link href="/admin/affiliate/programs">
              <Button variant="outline" type="button" disabled={isLoading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>Creating...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Program
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}