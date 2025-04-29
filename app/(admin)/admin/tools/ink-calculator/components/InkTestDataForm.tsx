"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InkMode } from "@/app/tools/ink-calculator/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define form schema
const formSchema = z.object({
  inkMode: z.string().min(1, "Ink mode is required"),
  quality: z.enum(["draft", "standard", "high"], {
    required_error: "Quality setting is required",
  }),
  imageType: z.enum(["solid", "gradient", "photo", "line_art"], {
    required_error: "Image type is required",
  }),
  width: z.coerce.number().positive("Width must be positive"),
  height: z.coerce.number().positive("Height must be positive"),
  unit: z.enum(["in", "mm"], {
    required_error: "Unit is required",
  }),
  notes: z.string().optional(),
  channelValues: z.record(z.string().transform((val, ctx) => {
    if (val === "") return 0;
    const parsed = parseFloat(val);
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a valid number",
      });
      return 0;
    }
    return parsed;
  })),
});

type FormValues = z.infer<typeof formSchema>;

interface InkTestDataFormProps {
  inkModes: Record<string, InkMode>;
}

export function InkTestDataForm({ inkModes }: InkTestDataFormProps) {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeChannels, setActiveChannels] = useState<string[]>([]);
  const [channelInputValues, setChannelInputValues] = useState<Record<string, string>>({});
  const [submissionStatus, setSubmissionStatus] = useState<string>("");
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inkMode: "CMYK",
      quality: "standard",
      imageType: "photo",
      width: 5,
      height: 5,
      unit: "in",
      notes: "",
      channelValues: {},
    },
    mode: "onBlur",
  });

  // Handle ink mode change to update active channels
  const handleInkModeChange = (value: string) => {
    const selectedMode = inkModes[value];
    if (selectedMode) {
      setActiveChannels(selectedMode.channels);
      
      // Initialize channel input values for new channels
      const newChannelInputValues = { ...channelInputValues };
      selectedMode.channels.forEach(channel => {
        if (!newChannelInputValues[channel]) {
          newChannelInputValues[channel] = "";
        }
      });
      
      setChannelInputValues(newChannelInputValues);
    }
  };

  // Initialize channels based on selected ink mode
  if (activeChannels.length === 0 && form.getValues().inkMode) {
    handleInkModeChange(form.getValues().inkMode);
  }

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (!imageFile) {
      toast.error("Please upload a test image");
      return;
    }

    // Validate that all channel values are properly entered
    const missingChannels = activeChannels.filter(
      channel => !channelInputValues[channel] && channelInputValues[channel] !== "0"
    );

    if (missingChannels.length > 0) {
      toast.error(`Missing values for channels: ${missingChannels.join(", ")}`);
      return;
    }

    // Set modal visibility first, before any async operations
    setIsSubmitting(true);
    setShowLoadingModal(true);
    
    try {
      // Show first status message
      setSubmissionStatus("Preparing form data...");
      
      // Prepare form data for submission
      const formData = new FormData();
      formData.append("inkMode", values.inkMode);
      formData.append("quality", values.quality);
      formData.append("imageType", values.imageType);
      formData.append("image", imageFile);
      
      // Add dimensions
      const dimensions = {
        width: values.width,
        height: values.height,
        unit: values.unit,
      };
      formData.append("dimensions", JSON.stringify(dimensions));
      
      // Add channel mL values - convert string values to numbers
      const channelMl: Record<string, number> = {};
      activeChannels.forEach(channel => {
        const val = channelInputValues[channel] || "0";
        channelMl[channel] = parseFloat(val) || 0;
      });
      
      formData.append("channelMl", JSON.stringify(channelMl));
      
      if (values.notes) {
        formData.append("notes", values.notes);
      }
      
      // Update status before API call
      setSubmissionStatus("Uploading test data to server...");
      
      // Submit form data
      const response = await fetch("/api/admin/ink-test-data", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add test data");
      }
      
      setSubmissionStatus("Data saved successfully!");
      toast.success("Test data added successfully");
      
      // Reset form
      form.reset();
      setImageFile(null);
      setImagePreview(null);
      
      // Refresh data
      router.refresh();
    } catch (error: any) {
      setSubmissionStatus(`Error: ${error.message || "An unknown error occurred"}`);
      toast.error(error.message || "An error occurred");
    } finally {
      // Keep modal open for a moment longer so user can see final status
      setTimeout(() => {
        setShowLoadingModal(false);
        setIsSubmitting(false);
        setSubmissionStatus("");
      }, 1500);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="inkMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ink Mode</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleInkModeChange(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ink mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(inkModes).map(([id, mode]) => (
                          <SelectItem key={id} value={id}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Ink configuration used for the test print
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Print Quality</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft (360×360 dpi)</SelectItem>
                        <SelectItem value="standard">Standard (720×720 dpi)</SelectItem>
                        <SelectItem value="high">High (1440×720 dpi)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Quality setting used for the test print
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="imageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select image type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="solid">Solid Color (100% coverage)</SelectItem>
                        <SelectItem value="gradient">Gradient (50% avg coverage)</SelectItem>
                        <SelectItem value="photo">Photo (mixed coverage)</SelectItem>
                        <SelectItem value="line_art">Line Art (&lt;10% coverage)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Type of test image used
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Width</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in">Inches</SelectItem>
                        <SelectItem value="mm">Millimeters</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <FormLabel>Upload Test Image</FormLabel>
                <div className="mt-1 flex flex-col gap-2">
                  <Input 
                    type="file" 
                    accept="image/jpeg,image/png" 
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  
                  {imagePreview && (
                    <div className="relative">
                      <Card className="overflow-hidden p-1">
                        <div className="relative aspect-square w-full max-h-[200px] flex items-center justify-center">
                          <Image 
                            src={imagePreview} 
                            alt="Test image preview" 
                            className="object-contain max-h-[200px] w-auto mx-auto"
                            width={200}
                            height={200}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Card>
                    </div>
                  )}
                  
                  <FormDescription>
                    Upload the actual test image used for the print (PNG or JPEG)
                  </FormDescription>
                </div>
              </div>
              
              <Accordion type="single" collapsible defaultValue="ml-values">
                <AccordionItem value="ml-values">
                  <AccordionTrigger>Ink Usage Values (mL)</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {activeChannels.map((channel) => (
                        <div key={channel} className="grid grid-cols-2 gap-4 items-center">
                          <FormLabel className="capitalize">{channel}</FormLabel>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={channelInputValues[channel] || ""}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              // Allow empty string or valid decimal number format
                              if (inputValue === "" || /^[0-9]*\.?[0-9]*$/.test(inputValue)) {
                                setChannelInputValues({
                                  ...channelInputValues,
                                  [channel]: inputValue
                                });
                              }
                            }}
                          />
                        </div>
                      ))}
                      <FormDescription>
                        Enter the exact mL values from UVMake preview
                      </FormDescription>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about the test print..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional notes about this test data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Add Test Data"}
          </Button>
        </form>
      </Form>
      
      {/* Loading Modal - update to use forceMount to ensure it's in the DOM */}
      <Dialog 
        open={showLoadingModal} 
        onOpenChange={(open) => {
          // Only allow closing if we're not in the middle of submitting
          if (!isSubmitting) setShowLoadingModal(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Saving Test Data</DialogTitle>
            <DialogDescription>
              Please wait while we save your test data...
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="flex flex-col items-center justify-center gap-4">
              {isSubmitting && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{submissionStatus}</p>
                </div>
              )}
              {!isSubmitting && submissionStatus.startsWith("Data saved") && (
                <p className="text-sm text-green-600">{submissionStatus}</p>
              )}
              {!isSubmitting && submissionStatus.startsWith("Error") && (
                <p className="text-sm text-red-600">{submissionStatus}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 