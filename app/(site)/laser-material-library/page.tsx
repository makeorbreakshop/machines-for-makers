"use client";

import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // This is where we'll connect to ConvertKit
    // For now, just simulate an API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setEmail("");
    }, 1500);
  };

  const materialTypes = [
    { name: "Acrylic", color: "bg-emerald-100 text-emerald-800", symbol: "Ac" },
    { name: "Wood", color: "bg-amber-100 text-amber-800", symbol: "Wd" },
    { name: "Leather", color: "bg-orange-100 text-orange-800", symbol: "Le" },
    { name: "Metal", color: "bg-blue-100 text-blue-800", symbol: "Me" },
    { name: "Glass", color: "bg-sky-100 text-sky-800", symbol: "Gl" },
    { name: "Fabric", color: "bg-violet-100 text-violet-800", symbol: "Fb" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <section className="container relative pt-12 md:pt-20 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col space-y-8 max-w-xl">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-br from-red-600 via-primary to-purple-600">
                Perfect Cuts, Perfect Engraving: The Ultimate Settings Library
              </h1>
              <p className="text-xl text-muted-foreground">
                Organized by material, machine type, and power level — find exactly what you need in seconds.
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-lg border p-6">
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
                    />
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Signing up..." : "Join Waitlist"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>

          <div className="lg:pl-8 xl:pl-12">
            <div className="relative bg-card border shadow-xl rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-background/0"></div>
              
              {/* Sample Settings Interface Preview */}
              <Tabs defaultValue="aluminum" className="w-full">
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Material Settings</h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center px-3 py-1 rounded-md bg-primary/10 text-sm">
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
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Materials Library</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive database covers over 50 materials with verified settings for perfect results every time.
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {materialTypes.map((material, i) => (
              <motion.div
                key={material.name}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border aspect-square transition-all",
                  material.color
                )}
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <span className="text-3xl font-mono font-bold mb-2">{material.symbol}</span>
                <span className="text-sm">{material.name}</span>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground mb-4">Plus many more materials in our growing database</p>
            <Button variant="outline" className="group">
              View All Materials
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 