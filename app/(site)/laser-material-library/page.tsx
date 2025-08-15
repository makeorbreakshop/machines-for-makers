"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Settings, Sparkles, Scissors, ArrowRight, Box, Zap, Search, FlameKindling } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function LaserMaterialLibraryPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  
  // Capture UTM parameters
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const params: Record<string, string> = {};
    
    // Capture all UTM parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = searchParams.get(param);
      if (value) params[param] = value;
    });
    
    // Also capture the full landing page URL
    if (Object.keys(params).length > 0) {
      params.landing_page = window.location.href;
    }
    
    setUtmParams(params);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/convertkit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          utmParams: Object.keys(utmParams).length > 0 ? utmParams : null 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      // Success
      setIsSubmitted(true);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const materialTypes = [
    { name: "Acrylic", color: "bg-emerald-100 border-emerald-300", textColor: "text-emerald-700", symbol: "Ac", atomicNumber: "01" },
    { name: "Wood", color: "bg-amber-100 border-amber-300", textColor: "text-amber-700", symbol: "Wd", atomicNumber: "02" },
    { name: "Leather", color: "bg-orange-100 border-orange-300", textColor: "text-orange-700", symbol: "Le", atomicNumber: "03" },
    { name: "Metal", color: "bg-blue-100 border-blue-300", textColor: "text-blue-700", symbol: "Me", atomicNumber: "04" },
    { name: "Glass", color: "bg-sky-100 border-sky-300", textColor: "text-sky-700", symbol: "Gl", atomicNumber: "05" },
    { name: "Fabric", color: "bg-violet-100 border-violet-300", textColor: "text-violet-700", symbol: "Fb", atomicNumber: "06" },
    { name: "Paper", color: "bg-neutral-100 border-neutral-300", textColor: "text-neutral-700", symbol: "Pa", atomicNumber: "07" },
    { name: "Cardboard", color: "bg-yellow-100 border-yellow-300", textColor: "text-yellow-700", symbol: "Cb", atomicNumber: "08" },
    { name: "Cork", color: "bg-amber-100 border-amber-300", textColor: "text-amber-800", symbol: "Ck", atomicNumber: "09" },
    { name: "Rubber", color: "bg-gray-100 border-gray-300", textColor: "text-gray-700", symbol: "Rb", atomicNumber: "10" },
    { name: "Foam", color: "bg-pink-100 border-pink-300", textColor: "text-pink-700", symbol: "Fm", atomicNumber: "11" },
    { name: "MDF", color: "bg-yellow-100 border-yellow-300", textColor: "text-yellow-800", symbol: "Md", atomicNumber: "12" },
    { name: "Plywood", color: "bg-amber-100 border-amber-300", textColor: "text-amber-700", symbol: "Pw", atomicNumber: "13" },
    { name: "Aluminum", color: "bg-gray-100 border-gray-300", textColor: "text-gray-700", symbol: "Al", atomicNumber: "14" },
    { name: "Steel", color: "bg-slate-100 border-slate-300", textColor: "text-slate-700", symbol: "St", atomicNumber: "15" },
    { name: "Brass", color: "bg-yellow-100 border-yellow-300", textColor: "text-yellow-800", symbol: "Br", atomicNumber: "16" },
    { name: "Titanium", color: "bg-slate-100 border-slate-300", textColor: "text-slate-800", symbol: "Ti", atomicNumber: "17" },
    { name: "Denim", color: "bg-indigo-100 border-indigo-300", textColor: "text-indigo-700", symbol: "Dn", atomicNumber: "18" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container relative pt-12 md:pt-20 pb-16 lg:pb-24 bg-gradient-to-b from-background to-muted/10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col space-y-8 max-w-xl">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-700">
                Perfect Cuts, Perfect Engraving: The Ultimate Settings Library
              </h1>
              <p className="text-xl text-muted-foreground">
                Organized by material, machine type, and power level — find exactly what you need in seconds.
              </p>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6">
              {isSubmitted ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-2xl font-bold mb-2">You're on the list!</h3>
                  <p className="text-muted-foreground">
                    We'll notify you when the settings library launches.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold mb-2">Get Early Access</h3>
                  <p className="text-muted-foreground mb-4">
                    Join the waitlist to be notified when we launch and get exclusive settings.
                  </p>
                  <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-grow"
                      disabled={isSubmitting}
                    />
                    <Button 
                      type="submit" 
                      variant="default"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Signing up..." : "Join Waitlist"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                  {error && (
                    <p className="text-red-500 text-sm mt-2">{error}</p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="lg:pl-8 xl:pl-12">
            <div className="relative bg-card border shadow-sm rounded-lg overflow-hidden">
              {/* Sample Settings Interface Preview */}
              <Tabs defaultValue="aluminum" className="w-full">
                <div className="p-4 border-b bg-muted/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Material Settings</h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center px-3 py-1 rounded-md bg-muted text-sm">
                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                        <span>50W CO2 Laser</span>
                      </div>
                    </div>
                  </div>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="aluminum">Aluminum</TabsTrigger>
                    <TabsTrigger value="acrylic">Acrylic</TabsTrigger>
                    <TabsTrigger value="wood">Wood</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="aluminum" className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border rounded-lg p-3 bg-blue-50/50">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-blue-800">Engrave</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Verified</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Speed</span>
                          <div>300 mm/s</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Power</span>
                          <div>75%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Passes</span>
                          <div>1</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Frequency</span>
                          <div>20 kHz</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-red-50/50">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-red-800">Cut</h4>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Verified</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Speed</span>
                          <div>10 mm/s</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Power</span>
                          <div>95%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Passes</span>
                          <div>3</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Frequency</span>
                          <div>20 kHz</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center mt-6">
                    <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Browse 24 more settings for aluminum...</span>
                  </div>
                </TabsContent>
                
                <TabsContent value="acrylic" className="p-4">
                  <div className="text-center py-12 text-muted-foreground">
                    Sign up for early access to view all materials
                  </div>
                </TabsContent>
                
                <TabsContent value="wood" className="p-4">
                  <div className="text-center py-12 text-muted-foreground">
                    Sign up for early access to view all materials
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {/* Materials Section */}
      <section className="py-16 bg-muted/20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Materials Library</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive database covers over 50 materials with verified settings for perfect results every time.
            </p>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 md:gap-3">
            {materialTypes.map((material, i) => (
              <motion.div
                key={material.name}
                className={cn(
                  "flex flex-col items-center p-0 rounded-md border shadow-sm aspect-square transition-all",
                  material.color
                )}
                whileHover={{ scale: 1.08, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
              >
                <div className="w-full h-full flex flex-col p-2 relative">
                  {/* Atomic number - top left */}
                  <div className="text-left w-full">
                    <span className={cn("text-xs font-medium", material.textColor)}>{material.atomicNumber}</span>
                  </div>
                  
                  {/* Symbol - centered */}
                  <div className="flex-grow flex items-center justify-center">
                    <span className={cn("text-5xl font-extrabold tracking-tight", material.textColor)}>{material.symbol}</span>
                  </div>
                  
                  {/* Name - bottom centered */}
                  <div className="text-center w-full mt-auto">
                    <span className={cn("text-xs font-medium", material.textColor)}>{material.name}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground mb-4">Plus many more materials in our growing database</p>
            <Button variant="outline" size="sm" className="group">
              View All Materials
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 
