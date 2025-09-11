"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { BarChart3, Calendar, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const reportSchema = z.object({
  program_id: z.string().uuid('Please select a program'),
  period_type: z.enum(['quarter', 'month', 'custom']),
  period_value: z.string().min(1, 'Please select a period'),
  include_unmatched: z.boolean().default(true),
  include_drafts: z.boolean().default(false),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface Program {
  id: string;
  name: string;
  brands: {
    Name: string;
    Slug: string;
  };
}

interface ReportGeneratorProps {
  programs: Program[];
}

export function ReportGenerator({ programs }: ReportGeneratorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      program_id: '',
      period_type: 'quarter',
      period_value: '',
      include_unmatched: true,
      include_drafts: false,
    },
  });

  const periodType = form.watch('period_type');

  const getQuarterOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    
    // Generate options for current year and previous year
    for (const year of [currentYear, currentYear - 1]) {
      for (let quarter = 4; quarter >= 1; quarter--) {
        options.push({
          value: `Q${quarter}-${year}`,
          label: `Q${quarter} ${year}`,
        });
      }
    }
    
    return options;
  };

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // Generate options for last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      options.push({ value, label });
    }
    
    return options;
  };

  const onSubmit = async (data: ReportFormData) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/admin/affiliate/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate report');
      }

      const result = await response.json();
      
      toast({
        title: 'Report Generated',
        description: 'Your affiliate report has been generated successfully.',
      });

      // Redirect to the generated report
      if (result.report_url) {
        window.open(result.report_url, '_blank');
      }

      // Refresh the page to show the new report in the list
      router.refresh();
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (programs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No Active Programs</h3>
              <p className="text-sm text-muted-foreground">
                Create an affiliate program first to generate reports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Generate New Report</span>
        </CardTitle>
        <CardDescription>
          Create a performance report for partners to view their affiliate sales data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="program_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affiliate Program</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name} ({program.brands.Name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose which affiliate program to generate a report for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="quarter">Quarterly</SelectItem>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="custom" disabled>Custom Range (Coming Soon)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the time period type for the report
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="period_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {periodType === 'quarter' ? 'Quarter' : 'Month'}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${periodType}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {periodType === 'quarter' && getQuarterOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                      {periodType === 'month' && getMonthOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the specific {periodType} to generate the report for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="include_unmatched"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Include Unmatched Products</FormLabel>
                      <FormDescription>
                        Include sales where products couldn't be matched to specific machines
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

              <FormField
                control={form.control}
                name="include_drafts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Include Draft Sales</FormLabel>
                      <FormDescription>
                        Include sales with pending or unconfirmed status
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

            <div className="flex justify-end">
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}