"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { 
  Check, 
  X, 
  ArrowRight, 
  ChevronDown, 
  Flame, 
  Zap, 
  Settings, 
  Laptop,
  BookOpen,
  Video,
  Beaker,
  Users,
  Library,
  Palette,
  Lock,
  Star,
  Clock,
  DollarSign
} from "lucide-react"
import Breadcrumb from "@/components/breadcrumb"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

export default function LearnLightburnPage() {
  // Create breadcrumb items
  const breadcrumbItems = [{ label: "Learn Lightburn for Lasers", href: "/learn-lightburn-for-lasers" }]

  // Ensure supabase image URL is correctly set with your project URL
  const supabaseImageUrlBase = "https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/learn-lightburn";
  
  // Course price - centralized for easy updating
  const coursePrice = "$197";
  
  // Podia checkout URL - used for all CTA buttons
  const podiaCheckoutUrl = "https://course.makeorbreakshop.com/learn-lightburn-for-lasers/buy";
  
  // Track scroll position for progress bar
  const [scrollProgress, setScrollProgress] = React.useState(0);
  
  // Handle scroll events to update progress bar
  React.useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.body.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div>
      {/* Fixed Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50">
        <Progress value={scrollProgress} className="w-full h-full bg-transparent" />
      </div>
      
      {/* Hero Section with blue background */}
      <section className="py-12 md:py-20 bg-[#2e88c7] text-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="md:w-1/2 text-center md:text-left">
              <h1 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                Laser Beginner to Pro in Days not Months
              </h1>
              <p className="text-xl md:text-2xl mb-6 max-w-xl mx-auto md:mx-0">
                Discover the exact Lightburn process for flawless cut and engraves so you can stop wasting expensive materials and time.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-8">
                <Button 
                  size="lg" 
                  className="bg-[#ff6b00] text-white hover:bg-[#ff6b00]/90 hover:scale-105 transition-all duration-300 font-semibold"
                  onClick={() => {
                    window.location.href = podiaCheckoutUrl;
                  }}
                >
                  Get Started Now
                </Button>
              </div>
              
              <div className="space-y-2 mt-8">
                {[
                  "Step-by-step proven process",
                  "Works with any laser that uses Lightburn",
                  "30-day money-back guarantee"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <p className="text-lg">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="md:w-1/2">
              <div className="relative aspect-video bg-black/20 rounded-lg overflow-hidden shadow-2xl border-2 border-white/30 group transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                {/* Replace with actual video embed or thumbnail with play button */}
                <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={() => {
                  // Open video modal or play video
                  // This would typically connect to a video modal component
                  alert("Video playback would start here");
                }}>
                  <div className="h-20 w-20 rounded-full bg-[#ff6b00] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white ml-1">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <Image 
                  src={`${supabaseImageUrlBase}/hero/7a2ca51-8fe4-4ccc-cdd2-7c8fea70d8ae_learn-lightburn-logo-1_1744054561004.webp`}
                  alt="Learn Lightburn" 
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial section - Updated to carousel with multiple testimonials */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              What Students Are Saying
            </h2>
            <p className="text-xl text-gray-600">
              <span className="font-bold text-[#2e88c7]">500+</span> Happy Students and Counting
            </p>
          </div>
          
          <Carousel 
            className="mx-auto"
            opts={{
              align: "center",
              loop: true,
            }}
          >
            <CarouselContent>
              {[
                {
                  quote: "I learned a lot from these videos especially not knowing anything about this space!",
                  author: "Derrick",
                  rating: 5,
                  image: `${supabaseImageUrlBase}/testimonials/derrick.webp` // Add actual image path if available
                },
                {
                  quote: "The pace of the information presented was the biggest plus for me!",
                  author: "Carl",
                  rating: 5,
                  image: `${supabaseImageUrlBase}/testimonials/carl.webp` // Add actual image path if available
                },
                {
                  quote: "Easy to follow modules that made perfect sense from the beginning.",
                  author: "Steve Mosely (MakingAtHome)",
                  rating: 5,
                  image: `${supabaseImageUrlBase}/testimonials/steve.webp` // Add actual image path if available
                },
                {
                  quote: "I was wasting so much material before this course. Now I get perfect results first time!",
                  author: "Jennifer K.",
                  rating: 5,
                  image: `${supabaseImageUrlBase}/testimonials/jennifer.webp` // Add actual image path if available
                },
              ].map((testimonial, i) => (
                <CarouselItem key={i} className="md:basis-3/4">
                  <Card className="border border-gray-200 h-full hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="pt-6 pb-2 px-6">
                      <div className="flex mb-4">
                        {Array(testimonial.rating).fill(0).map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xl md:text-2xl italic font-medium mb-6">
                        "{testimonial.quote}"
                      </p>
                    </CardContent>
                    <CardFooter className="px-6 pb-6 flex items-center gap-3">
                      {testimonial.image && (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <div className="bg-gray-200 w-full h-full flex items-center justify-center text-gray-500">
                            {testimonial.author.charAt(0)}
                          </div>
                        </div>
                      )}
                      <p className="text-lg text-gray-700 font-medium">- {testimonial.author}</p>
                    </CardFooter>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="hidden md:flex items-center justify-center gap-2 mt-8">
              <CarouselPrevious className="relative inset-auto left-0 right-0 translate-y-0" />
              <CarouselNext className="relative inset-auto left-0 right-0 translate-y-0" />
            </div>
          </Carousel>
          
          <div className="mt-16 text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-10">Official Course Provider For</h2>
            <div className="flex justify-center items-center gap-16">
              {/* Partner logos - displayed larger and with proper spacing */}
              <div className="h-20 w-48 relative">
                <Image 
                  src={`${supabaseImageUrlBase}/partners/b0b3be5-3e10-daac-2741-f441345f3c3_57d925ee-92cd-4c88-a98a-ee780147a8dd_1744054564753.webp`} 
                  alt="Omtech" 
                  fill 
                  className="object-contain"
                  sizes="(max-width: 768px) 120px, 192px"
                  unoptimized
                />
              </div>
              <div className="h-20 w-48 relative">
                <Image 
                  src={`${supabaseImageUrlBase}/partners/56a880a-655-ed0b-54f0-28e61d051eb_screenshot_2025-02-24_at_3_1744054558302.webp`} 
                  alt="OneLaser" 
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 120px, 192px"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Does This Sound Like You? Section - Maintained as part of the hero section */}
      <section className="py-12 mb-0 bg-[#2e88c7] text-white border-t border-white/10 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px'
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Does This Sound Like You?</h2>
            <div className="space-y-4">
              {[
                "You've cobbled together free tutorials but still can't get the results you want",
                "Your wasting tons of expensive material and time",
                "You think the only way to get pro-result is with expensive machines",
                "You want to create awesome products, but aren't sure how",
                "Your laser isn't performing like you know it can",
                "You waste time fighting confusing software instead of creating"
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 hover:translate-x-1 transition-transform duration-200">
                  <div className="mt-1 flex-shrink-0 bg-green-500 rounded-full p-1">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-lg">{item}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-lg text-center italic">You're not alone...</p>
          </div>
        </div>
      </section>
      
      {/* Story Section - White background with clear heading */}
      <section className="py-16 mb-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-bold mb-8">
              My $2,000 Laser Cutter Was a Complete Waste of Money... Until I Discovered This Simple System That Changed Everything
            </h2>
            <Button 
              size="lg" 
              className="bg-[#ff6b00] text-white hover:bg-[#ff6b00]/90 hover:scale-105 transition-all duration-300 font-semibold px-8 py-6 text-lg"
              onClick={() => {
                window.location.href = podiaCheckoutUrl;
              }}
            >
              Sign up now
            </Button>
          </div>
          
          <div className="prose prose-lg max-w-3xl mx-auto space-y-6 mt-12">
            <p>
              I took nice pictures, created the listing, and made my first sale of many.
            </p>
            <p>
              Fast forward a few months and I had my YouTube channel up and running. Video after video, I kept seeing comments like…
            </p>
            <div className="bg-[#f5f7f8] p-4 rounded-md italic border-l-4 border-[#2e88c7] shadow-sm">
              <p className="mb-2">"How do I fix this alignment issue?"</p>
              <p className="mb-2">"Why won't my laser cut all the way through?"</p>
              <p className="mb-2">"How do I get rid of these burn marks?"</p>
              <p>"Why won't this #$%&** work!"</p>
            </div>
            <p className="italic text-xl font-medium text-[#2e88c7]">That's when it hit me.</p>
            <p>
              I could save others from the smoke-filled room I was stuck in.
            </p>
            <p>
              It wasn't about being a tech genius, but having a system and a <strong>clear path</strong> through the complexity.
            </p>
            <p>
              Projects that took days finished in hours. Material waste nearly vanished.
            </p>
            <p>
              My laser transformed from an expensive space waster into a reliable profit center.
            </p>
            <p>
              If you're staring at your laser right now, surrounded by failed attempts and feeling that knot in your stomach, I've been there.
            </p>
            <p className="italic text-xl">
              The secret to laser cutting success isn't becoming more technical.
            </p>
            <p className="font-bold text-xl">
              It's following a clear roadmap for artists and entrepreneurs, not tech specialists.
            </p>
          </div>
        </div>
      </section>
      
      {/* Personal Story Section - Light background with styling to match original */}
      <section className="py-16 bg-[#f5f7f8] -mt-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="prose prose-lg max-w-3xl mx-auto space-y-6">
            <p className="italic text-center text-2xl font-medium">
              "Well, that's $2000 down the drain."
            </p>
            <p>
              I was standing in front of my new laser, trying to see through the smoke.
            </p>
            <p className="font-bold">
              I had failed again.
            </p>
            <p>
              Why couldn't I just get this thing to work?
            </p>
            <p>
              I've spent hours watching disjointed YouTube tutorials, only to have a huge pile of failed pieces of wood to show for it.
            </p>
            <p>
              The worst part?
            </p>
            <p>
              This wasn't a hobby for me. I had actual products to design, pictures to take, and Etsy listings to create.
            </p>
            <p>
              And more importantly, sales to help pay for the machine.
            </p>
            <p>
              This was supposed to be a revenue generator, not a time-consuming hobby project.
            </p>
            <p>
              Real money was at stake.
            </p>
            <p>
              My breaking point came with Black Friday approaching. If I was going to sell anything this year, it was now.
            </p>
            <p>
              I'd created a killer ornament design. The digital mockup looked perfect. But watching my laser butcher attempt after attempt was like seeing money burn.
            </p>
            <p>
              Something had to change.
            </p>
            <p className="font-bold">
              Fast.
            </p>
            <p>
              I locked myself away for a week. No more random YouTube videos or guesswork.
            </p>
            <p>
              I tested nearly every setting and built my own step-by-step workflow to get the ornament done.
            </p>
            <p>
              And then…finally, something that didn't look half bad!
            </p>
            
            {/* Add ornament image at the end of the story */}
            <div className="pt-4">
              <Image 
                src={`${supabaseImageUrlBase}/story/ac7aded-178c-d125-77bc-ac5a8435dc5_screenshot_2025-02-25_at_8_20_21_am_1744054564012.webp`}
                alt="Successful ornament design" 
                width={700} 
                height={394}
                className="mx-auto rounded-lg shadow-xl"
                sizes="(max-width: 768px) 90vw, 700px"
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* YouTube Testimonials - Blue background to match original */}
      <section className="py-16 mb-16 bg-[#2e88c7] text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
            A few comments from my free tutorials on YouTube
          </h2>
          <h3 className="text-lg md:text-xl font-medium text-center mb-10 italic">
            (12 million views and counting...)
          </h3>
          
          <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto">
            {[
              `${supabaseImageUrlBase}/comments/670e0fe-5b1a-f836-dd5b-b4dafe803bc_screenshot_2025-02-24_at_1_1744054559647.webp`,
              `${supabaseImageUrlBase}/comments/f1bc77c-0be-82e1-ee6a-f4c81eac7662_screenshot_2025-02-24_at_1_1744054568655.webp`,
              `${supabaseImageUrlBase}/comments/60cf0b-6e76-058-6820-5dd1f74c223_screenshot_2025-02-24_at_1_1744054559269.webp`,
              `${supabaseImageUrlBase}/comments/ff6f25-77c1-7fec-2e1c-238b5000f80_screenshot_2025-02-24_at_1_1744054570162.webp`
            ].map((imageSrc, i) => (
              <div key={i} className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
                <Image 
                  src={imageSrc}
                  alt={`YouTube Comment ${i + 5}`}
                  width={600}
                  height={200}
                  className="w-full object-scale-down"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* How to Learn Lightburn - White background with improved spacing */}
      <section className="py-16 mb-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
            How do you ACTUALLY learn Lightburn without wasting time?
          </h2>
          
          <div className="prose prose-lg max-w-3xl mx-auto space-y-4">
            <p className="text-xl font-medium">The secret to mastering your laser is simple.</p>
            <div className="space-y-3">
              {[
                "Learn every setting and feature Lightburn has to offer.",
                "Focus just on the ones that matter",
                "Ignore everything else."
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 bg-green-500 rounded-full p-1">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg">{item}</span>
                </div>
              ))}
            </div>
            <p className="pt-2">
              The best way to do that is to spend hours and hours learning the specific settings and processes that work with your laser.
            </p>
            <p>
              But luckily, you don't have to because I've already done it for you.
            </p>
            <p>
              This is a complete guide that focuses on what you really need to know (and what you can ignore) to get perfect cuts and engraves from your laser.
            </p>
            <p>
              Not only that this is the exact process I use when I'm setting up a new machine to test on my YouTube channel as well create brand new products from scratch.
            </p>
          </div>
          
          {/* Benefits box - enhanced styling to match original */}
          <div className="mt-10 bg-[#2e88c7] text-white rounded-xl p-8 shadow-lg max-w-4xl mx-auto">
            <h3 className="text-xl font-bold mb-6">Sign up today so you can:</h3>
            <ul className="space-y-5">
              {[
                "Trade endless YouTube searches for a complete, tested framework built by someone who's faced your exact challenges",
                "Navigate Lightburn with confidence and ease, even if you consider yourself \"non-technical\"",
                "Gain ongoing support and resources that take you beyond basics to true mastery",
                "Save hundreds in wasted materials with tested, reliable power and speed configurations for every project",
                "Say goodbye to blurry engravings and incomplete cuts with mastery of proper material positioning",
                "Replace software confusion with logical workflows that make every project feel effortless",
                "Maximize your current laser's capabilities, producing results that rival machines costing thousands more"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0 bg-green-500 rounded-full p-1">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      
      {/* Triple Beam Process - Updated layout to match original */}
      <section className="py-16 mb-16 bg-[#2e88c7] text-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '52px 26px'
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Introducing The Triple Beam Process
            </h2>
            <p className="text-xl font-medium">
              <strong>From Frustration to Flawless Results in 3 Simple Steps</strong>
            </p>
          </div>
          
          {/* Changed to a side-by-side layout to match original */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Beam 1 */}
            <div className="flex flex-col items-center text-center group">
              <div className="relative overflow-hidden rounded-lg shadow-lg mb-4 hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2">
                <Image 
                  src={`${supabaseImageUrlBase}/process/2a78750-4353-da37-13dc-ccf751e6a75_screenshot_2025-02-25_at_2_49_40_pm-1_1744054554064.webp`}
                  alt="Beam 1: The Design" 
                  width={300} 
                  height={200}
                  className="w-full rounded-lg shadow-lg mb-0 group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2e88c7]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <span className="text-white font-bold text-lg">Step 1</span>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Beam 1: The Design</h3>
              <p className="text-lg">
                Transform your ideas into laser-ready files—whether creating from scratch or importing existing artwork.
              </p>
            </div>
            
            {/* Beam 2 */}
            <div className="flex flex-col items-center text-center group">
              <div className="relative overflow-hidden rounded-lg shadow-lg mb-4 hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2">
                <Image 
                  src={`${supabaseImageUrlBase}/process/ee4cb6-bbfc-268e-03e8-825d730d480_screenshot_2025-02-25_at_2_49_55_pm-1_1744054568114.webp`}
                  alt="Beam 2: The Settings" 
                  width={300} 
                  height={200}
                  className="w-full rounded-lg shadow-lg mb-0 group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2e88c7]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <span className="text-white font-bold text-lg">Step 2</span>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Beam 2: The Settings</h3>
              <p className="text-lg">
                Eliminate guesswork with proven settings that work every time. Use the test file process to focus in on what matters!
              </p>
            </div>
            
            {/* Beam 3 */}
            <div className="flex flex-col items-center text-center group">
              <div className="relative overflow-hidden rounded-lg shadow-lg mb-4 hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2">
                <Image 
                  src={`${supabaseImageUrlBase}/process/a26832e-38e6-cae3-8aea-b132b662ee8_build11_1744054563382.webp`}
                  alt="Beam 3: The Machine" 
                  width={300} 
                  height={200}
                  className="w-full rounded-lg shadow-lg mb-0 group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2e88c7]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <span className="text-white font-bold text-lg">Step 3</span>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Beam 3: The Machine</h3>
              <p className="text-lg">
                Learn how to properly connect, position, and operate your laser for perfect results every time.
              </p>
            </div>
          </div>
        
          <div className="text-center mt-12">
            <h3 className="text-xl font-bold mb-4">The best part?</h3>
            <p className="text-lg font-medium mb-8">
              <strong>You can implement the Triple Beam Process in just a few evenings</strong> — perfect if your trying to balance full-time work with a laser side hustle.
            </p>
            <Button 
              size="lg" 
              className="bg-[#ff6b00] text-white hover:bg-[#ff6b00]/90 hover:scale-105 transition-all duration-300 text-lg font-semibold px-8 py-6"
              onClick={() => {
                window.location.href = podiaCheckoutUrl;
              }}
            >
              Sign Up Now
            </Button>
          </div>
        </div>
      </section>
      
      {/* Steve Mosley Testimonial - Standalone section with gray background */}
      <section className="py-12 bg-gray-800 text-white -mt-1">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-3xl mx-auto text-center">
            <p className="italic text-xl mb-4">"Easy to follow modules that made perfect sense from the beginning."</p>
            <p className="font-semibold text-lg">-Steve Mosely (MakingAtHome)</p>
          </div>
        </div>
      </section>
      
      {/* Course Features - Grid layout to match original */}
      <section className="py-16 bg-[#f5f7f8] -mt-1">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">
            Everything you Get Access To
          </h2>
          
          {/* Bento Grid layout for features */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 max-w-5xl mx-auto">
            {/* Feature 1 - Processes - Large card spanning 3 columns */}
            <div className="md:col-span-3 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group overflow-hidden p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-[#2e88c7]/10 rounded-full flex items-center justify-center group-hover:bg-[#2e88c7]/20 transition-colors duration-300">
                  <ArrowRight className="h-8 w-8 text-[#2e88c7] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold">Processes</h3>
              </div>
              <p className="text-gray-600 mb-2">Follow proven frameworks that replace guesswork with reliable results every time.</p>
              <div className="mt-auto pt-4 border-t border-gray-100">
                <span className="text-sm text-[#2e88c7] font-medium flex items-center">
                  Learn more <ArrowRight className="h-4 w-4 ml-1" />
                </span>
              </div>
            </div>
            
            {/* Feature 2 - Video Training - Regular card spanning 3 columns */}
            <div className="md:col-span-3 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group overflow-hidden p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-[#2e88c7]/10 rounded-full flex items-center justify-center group-hover:bg-[#2e88c7]/20 transition-colors duration-300">
                  <Video className="h-8 w-8 text-[#2e88c7] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold">Video Training</h3>
              </div>
              <p className="text-gray-600 mb-2">Master the Triple Beam Process with on demand video training.</p>
              <div className="mt-auto pt-4 border-t border-gray-100">
                <span className="text-sm text-[#2e88c7] font-medium flex items-center">
                  Learn more <ArrowRight className="h-4 w-4 ml-1" />
                </span>
              </div>
            </div>
            
            {/* Feature 3 - Test Files - Spanning 2 columns */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group overflow-hidden p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-[#2e88c7]/10 rounded-full flex items-center justify-center group-hover:bg-[#2e88c7]/20 transition-colors duration-300">
                  <Beaker className="h-7 w-7 text-[#2e88c7] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold">Test Files</h3>
              </div>
              <p className="text-gray-600">Dial in your perfect settings for any machine, material, and cut type.</p>
            </div>
            
            {/* Feature 4 - Community Support - Spanning 2 columns */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group overflow-hidden p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-[#2e88c7]/10 rounded-full flex items-center justify-center group-hover:bg-[#2e88c7]/20 transition-colors duration-300">
                  <Users className="h-7 w-7 text-[#2e88c7] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold">Community</h3>
              </div>
              <p className="text-gray-600">Connect with fellow laser enthusiasts to share ideas and get help.</p>
            </div>
            
            {/* Feature 5 - Material Libraries - Spanning 2 columns */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group overflow-hidden p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-[#2e88c7]/10 rounded-full flex items-center justify-center group-hover:bg-[#2e88c7]/20 transition-colors duration-300">
                  <Library className="h-7 w-7 text-[#2e88c7] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold">Material Libraries</h3>
              </div>
              <p className="text-gray-600">Gain instant access to material settings libraries for perfect results.</p>
            </div>
            
            {/* Feature 6 - Design Files - Spanning 3 columns */}
            <div className="md:col-span-3 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group overflow-hidden p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-[#2e88c7]/10 rounded-full flex items-center justify-center group-hover:bg-[#2e88c7]/20 transition-colors duration-300">
                  <Palette className="h-7 w-7 text-[#2e88c7] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold">Design Files</h3>
              </div>
              <p className="text-gray-600">Ready-to-use designs that speed up your project workflow.</p>
            </div>
            
            {/* Feature 7 - Lifetime Access - Spanning 3 columns */}
            <div className="md:col-span-3 bg-[#2e88c7] text-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group overflow-hidden p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors duration-300">
                  <Lock className="h-7 w-7 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold">Lifetime Access</h3>
              </div>
              <p className="text-white/90">Enjoy unlimited access and free updates for as long as the course exists.</p>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <Button
              size="lg"
              className="bg-[#ff6b00] text-white hover:bg-[#ff6b00]/90 hover:scale-105 transition-all duration-300 font-semibold px-8 py-6 text-lg"
              onClick={() => {
                window.location.href = podiaCheckoutUrl;
              }}
            >
              Get Access Now
            </Button>
          </div>
        </div>
      </section>
      
      {/* Bonus #1 - Improved styling to match original */}
      <section className="py-16 bg-[#2e88c7] text-white -mt-1">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-[#ff6b00] text-white px-4 py-1 rounded-full text-sm font-bold">
                BONUS #1
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">
              Project Cost Calculator
            </h2>
            <p className="text-lg text-center mb-2">
              Stop guessing. Know exactly what each project costs and what to charge.
            </p>
            <p className="text-center mb-6 text-xl">
              <span className="line-through text-white/70 mr-2">$97 Value</span>
              <span className="font-bold">Included Free</span>
            </p>
            <ul className="space-y-4 max-w-2xl mx-auto">
              {[
                "Track material costs, machine time, and labor for perfect project pricing",
                "Eliminate undercharging with precise expense tracking for each design",
                "Account for test pieces and failed attempts in your final pricing",
                "Calculate true profit margins on every product you make"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 bg-green-500 rounded-full p-1">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-lg">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      
      {/* Testimonial - Styled to match original */}
      <section className="py-10 mb-16 max-w-xl mx-auto text-center">
        <div className="bg-gray-800 text-white p-6 rounded-xl shadow-sm">
          <p className="italic mb-2 text-lg">The pace of the information presented was the biggest plus for me!</p>
          <p className="font-semibold">-Carl</p>
        </div>
      </section>
      
      {/* Bonus #2 - Improved styling to match original */}
      <section className="py-16 mb-16 bg-[#2e88c7] text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-[#ff6b00] text-white px-4 py-1 rounded-full text-sm font-bold">
                BONUS #2
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">
              Laser Resource Directory
            </h2>
            <p className="text-lg text-center mb-2">
              Everything I use daily to create professional projects faster and cheaper.
            </p>
            <p className="text-center mb-6 text-xl">
              <span className="line-through text-white/70 mr-2">$49 Value</span>
              <span className="font-bold">Included Free</span>
            </p>
            <ul className="space-y-4 max-w-2xl mx-auto">
              {[
                "Access my curated list of affordable material suppliers for wood, acrylic, and tumblers",
                "Get my top AI design tools that create sellable designs in minutes (even for non-designers)",
                "Save with exclusive discount codes for essential supplies and software"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 bg-green-500 rounded-full p-1">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-lg">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      
      {/* About the Instructor - Improved layout to match original */}
      <section className="py-16 mb-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="md:w-1/3 flex-shrink-0">
              <div className="relative mx-auto w-80 h-80 md:w-96 md:h-96 shadow-xl bg-black rounded-lg overflow-hidden">
                <Image 
                  src={`${supabaseImageUrlBase}/instructor/brandon_1744054566142.webp`}
                  alt="Brandon - Instructor" 
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 320px, 384px"
                  unoptimized
                />
              </div>
            </div>
            <div className="md:w-2/3">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Hey there, I'm Brandon
              </h2>
              <div className="prose prose-lg space-y-4">
                <p>
                  I'm the guy behind the Make or Break Shop YouTube channel that's helped over 12.1 million viewers (and counting).
                </p>
                
                <p>
                  I review and test tons of different laser machines and teach people how to use them. I've probably gotten my hands on more different types of lasers than almost anyone out there.
                </p>
                
                <p>
                  <strong>What is my background?</strong>
                </p>
                
                <p>
                  I studied Aerospace Engineering, which helped me figure out the technical stuff, but let me tell you – I still hit all the same frustrating roadblocks you're probably facing.
                </p>
                
                <p>
                  <strong>Man, did I waste a lot of material and time in the beginning.</strong>
                </p>
                
                <p>
                  I've tested pretty much everything: cheap Ortur diode lasers, desktop CO2 machines from OMTech, xTool, and OneLaser, professional Thunder Laser systems, and even those fancy fiber lasers. If it cuts or engraves, I've probably played with it.
                </p>
                
                <p>
                  After tons of trial and error (and a few choice words), I figured out a system that actually works without all the headaches. No more guessing at settings or ruining expensive materials.
                </p>
                
                <p>
                  When I'm not geeking out over lasers, I'm making stuff for my three kids. They love the projects they can color themselves. And yeah, there's usually something Star Wars-related happening in my workshop too.
                </p>
                
                <p>
                  I made this course because I wish someone had just told me this stuff from the beginning. <strong>Skip the frustration. Make cool stuff sooner.</strong> That's the deal.
                </p>
                
                <p>
                  Let's get your laser doing what you actually bought it for!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* More YouTube Comments - Updated styling to match original */}
      <section className="py-16 bg-[#2e88c7] text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
            A few more recent YouTube comments
          </h2>
          
          <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto">
            {[
              `${supabaseImageUrlBase}/comments/670e0fe-5b1a-f836-dd5b-b4dafe803bc_screenshot_2025-02-24_at_1_1744054559647.webp`,
              `${supabaseImageUrlBase}/comments/f1bc77c-0be-82e1-ee6a-f4c81eac7662_screenshot_2025-02-24_at_1_1744054568655.webp`,
              `${supabaseImageUrlBase}/comments/60cf0b-6e76-058-6820-5dd1f74c223_screenshot_2025-02-24_at_1_1744054559269.webp`,
              `${supabaseImageUrlBase}/comments/ff6f25-77c1-7fec-2e1c-238b5000f80_screenshot_2025-02-24_at_1_1744054570162.webp`
            ].map((imageSrc, i) => (
              <div key={i} className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
                <Image 
                  src={imageSrc}
                  alt={`YouTube Comment ${i + 5}`}
                  width={600}
                  height={200}
                  className="w-full object-scale-down"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Project Examples - Improved grid layout to match original */}
      <section className="py-16 bg-[#f5f7f8] -mt-1">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
            The Type of Stuff We Will Make!
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              `${supabaseImageUrlBase}/projects/c7b2ce-825-5c3-c676-4f2ace10426_dsc00625_1744054566683.webp`,
              `${supabaseImageUrlBase}/projects/f6dcaed-2c33-c8e3-5308-60f0defb1568_dsc09210_1744054569699.webp`,
              `${supabaseImageUrlBase}/projects/a247661-725c-277c-fea7-a247a3a74567_screenshot_2025-02-25_at_2_21_49_pm-1_1744054561497.webp`,
              `${supabaseImageUrlBase}/projects/73dd13-d55e-a8ea-d32c-b5c881e1741_dsc08516_1744054560308.webp`,
              `${supabaseImageUrlBase}/projects/f67f81b-4447-e26-ded0-35ae00f427ad_dsc05073-1_1744054569297.webp`,
              `${supabaseImageUrlBase}/projects/02db36-54-2a7-8874-2a7dc70b6402_screenshot_2025-02-25_at_2_31_22_pm_1744054552450.webp`
            ].map((imageSrc, i) => (
              <div key={i} className="relative aspect-square bg-white rounded-xl overflow-hidden shadow-lg">
                <Image 
                  src={imageSrc}
                  alt={`Project Example ${i + 1}`}
                  fill
                  className="object-cover hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Is This Course Right For You - Updated styling to match original */}
      <section className="py-16 mb-16 bg-[#2e88c7] text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
            Is This Course Right For You?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-[#1c5a84]/30 p-8 rounded-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center">
                <Check className="h-6 w-6 mr-3 text-green-500" />
                This is for you if:
              </h3>
              <ul className="space-y-4">
                {[
                  "You have a laser cutter (any type) and Lightburn software",
                  "You're wasting materials and time on failed projects",
                  "You're tired of piecing together YouTube tutorials",
                  "You want to create products, not troubleshoot equipment"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-1" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-[#1c5a84]/30 p-8 rounded-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center">
                <X className="h-6 w-6 mr-3 text-red-500" />
                This is not for you if:
              </h3>
              <ul className="space-y-4">
                {[
                  "You already use Lightburn confidently",
                  "You don't own a laser or Lightburn software",
                  "You're seeking business strategies, not technical skills",
                  "You prefer figuring things out through trial and error"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-500 mt-1" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Money Back Guarantee - Updated styling to match original */}
      <section className="py-16 mb-16 bg-gray-800 text-white -mt-1">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/3">
              <Image 
                src={`${supabaseImageUrlBase}/guarantee/0fcdb0b-018d-11f-477a-3334e03e6f_30-day_1744054553521.webp`}
                alt="30-Day Money Back Guarantee" 
                width={200}
                height={200}
                className="max-w-full h-auto mx-auto"
                unoptimized
              />
            </div>
            <div className="md:w-2/3">
              <p className="text-xl">
                Here's the deal: if you don't like the course, I'll give you a full refund with 30 days. No questions asked. Period. But do me a favor: at least give it a shot first before asking for a refund.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section - New addition with clear value proposition */}
      <section id="buy-now" className="py-16 mb-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            Ready to Master Your Laser?
          </h2>
          <p className="text-xl text-center mb-12 text-gray-700">
            Get started today and stop wasting materials and time
          </p>
          
          <Card className="border-2 border-[#2e88c7] shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <CardHeader className="pb-4 text-center bg-[#2e88c7] text-white rounded-t-lg">
              <CardTitle className="text-3xl font-bold">Learn Lightburn for Lasers</CardTitle>
              <CardDescription className="text-white/90 text-lg">Complete Course + Bonus Materials</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex justify-center">
                <div className="text-center">
                  <p className="text-5xl font-bold mb-2">{coursePrice}</p>
                  <p className="text-gray-600 mb-6">One-time payment, lifetime access</p>
                </div>
              </div>
              
              <div className="space-y-4 mt-6">
                {[
                  "Triple Beam Process Masterclass (Complete Framework)",
                  "Proven Settings Library for All Major Materials",
                  "Ready-to-Use Project Templates",
                  "Bonus #1: Project Cost Calculator ($97 Value)",
                  "Bonus #2: Laser Resource Directory ($49 Value)",
                  "30-Day Money-Back Guarantee",
                  "Lifetime Access to All Updates"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0 bg-green-500 rounded-full p-1">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-lg">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-0 pb-8">
              <Button 
                size="lg" 
                className="w-full bg-[#ff6b00] text-white hover:bg-[#ff6b00]/90 hover:scale-105 transition-all duration-300 font-semibold py-6 text-xl"
                onClick={() => {
                  window.location.href = podiaCheckoutUrl;
                }}
              >
                Sign Up Now
              </Button>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Lock className="h-4 w-4" /> Secure checkout
              </div>
            </CardFooter>
          </Card>
          
          <div className="mt-8">
            <Alert className="bg-gray-50 border-gray-200">
              <Clock className="h-5 w-5" />
              <AlertTitle>Limited Time Only</AlertTitle>
              <AlertDescription>
                The price will increase to $247 after the next batch of students. Join now to lock in the current price.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </section>
      
      {/* FAQ Section - Improved styling to match original */}
      <section className="py-16 mb-16 bg-white" id="faq">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
            Frequently Asked Questions
          </h2>
          <p className="text-center text-lg text-gray-600 mb-12 max-w-3xl mx-auto">
            Still not sure? Here are answers to the most common questions about Learn Lightburn for Lasers.
          </p>
          
          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {[
                {
                  category: "Course Content",
                  questions: [
                    {
                      question: "Will this work for my specific laser machine?",
                      answer: "Yes! Whether you've got a budget diode laser or a fancy professional system, the Triple Beam Process works with any machine that runs Lightburn. I've tested these methods on dozens of different lasers, from Ortur and xTool to high-end Thunder Lasers."
                    },
                    {
                      question: "Do I Need Lighburn?",
                      answer: "Yep! The course lessons can work across the different types of Lightburn licenses but all the training will be centered on the software suite."
                    },
                    {
                      question: "How is this different from watching free YouTube tutorials?",
                      answer: "YouTube (even my channel!) gives you puzzle pieces without the full picture. This course is the complete roadmap that connects everything together. Plus, you get proven settings libraries, project templates, and community support you won't find scattered across random videos."
                    },
                    {
                      question: "Does this work for both cutting and engraving projects?",
                      answer: "Yep! The course covers everything from perfect clean-edge cuts to detailed engravings with proper depth and contrast. You'll master both skills across various materials."
                    }
                  ]
                },
                {
                  category: "Getting Started",
                  questions: [
                    {
                      question: "I'm not tech-savvy at all. Will I be able to follow along?",
                      answer: "Don't worry about being \"technical\" - many of our best students had zero tech background. I've designed this course specifically for regular people who want results, not tech specialists. Everything is broken down into simple, clear steps anyone can follow."
                    },
                    {
                      question: "I have a small workspace. Will this still work for me?",
                      answer: "Absolutely! Many students run successful laser businesses from spare bedrooms or small corners of their homes. The techniques focus on efficiency and precision, not space. You'd be amazed what you can create in even the tightest setup."
                    },
                    {
                      question: "How much time will I need to dedicate to this?",
                      answer: "Most students see dramatic improvements with just 2-3 hours of practice per week. You'll work at your own pace and start seeing results with your very first project after the initial modules."
                    },
                    {
                      question: "What if I've already been using my laser for a while?",
                      answer: "Even laser veterans discover major \"ah-ha!\" moments throughout the course. You'll eliminate those persistent issues you've been living with and learn workflow tricks that make you think, \"Why didn't anyone tell me this before?\""
                    }
                  ]
                },
                {
                  category: "Business & Results",
                  questions: [
                    {
                      question: "Will this help me reduce costs?",
                      answer: "The course typically pays for itself in saved materials within weeks. Our testing process and settings library eliminate the costly trial-and-error that burns through expensive materials."
                    },
                    {
                      question: "Can I really make money with my laser after taking this course?",
                      answer: "Many students turn their laser skills into profitable side businesses within weeks of completing the course. While results depend on your effort and local market, you'll have the technical foundation to create products people will actually pay for. The efficiency and quality you'll learn are essential for profitability."
                    },
                    {
                      question: "Do I need to be artistic or good at design?",
                      answer: "Not at all! The included templates and step-by-step design processes work regardless of your artistic skills. I've helped plenty of self-described \"non-creative\" people create professional-looking products their customers love."
                    },
                    {
                      question: "What makes your method different from others?",
                      answer: "The Triple Beam Process connects design, settings, and operation as one integrated system, not as separate challenges. Instead of random tips and tricks, you get a repeatable framework that works for any project on any machine."
                    }
                  ]
                },
                {
                  category: "Purchase & Access",
                  questions: [
                    {
                      question: "What if I'm not satisfied with the course?",
                      answer: "You're covered by a 30-day satisfaction guarantee. If you're not happy, just let me know and I'll refund you fully. No hoops to jump through, no hard feelings."
                    },
                    {
                      question: "How do I access the course after purchasing?",
                      answer: "You'll get immediate lifetime access to everything through our online platform. Watch videos, download resources, and join the community from any device — it's yours for as long as the course exists."
                    },
                    {
                      question: "When does the course start?",
                      answer: "Right away! The moment you purchase, you'll have access to all modules. It's completely self-paced, so you can jump straight to what matters most to you."
                    },
                    {
                      question: "Are there any other costs beyond the course fee?",
                      answer: "Nope! Your one-time payment covers everything — lifetime access, future updates, the community, and all bonus resources. The only additional costs would be materials for your projects, but you'll actually save on those by eliminating wasteful mistakes."
                    }
                  ]
                }
              ].map((category, categoryIndex) => (
                <div key={categoryIndex} className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 text-[#2e88c7]">{category.category}</h3>
                  {category.questions.map((faq, i) => (
                    <AccordionItem 
                      key={i} 
                      value={`category-${categoryIndex}-item-${i}`} 
                      className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow data-[state=open]:shadow-md bg-white mb-3"
                      data-faq-item
                    >
                      <AccordionTrigger 
                        className="text-left font-semibold px-6 py-4 hover:no-underline hover:bg-[#f5f7f8] transition-all text-lg"
                        data-question
                      >
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent 
                        className="px-6 pt-2 pb-6 bg-white text-lg"
                        data-answer
                      >
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </div>
              ))}
            </Accordion>
            
            <div className="mt-12 text-center">
              <p className="text-lg text-gray-700 mb-6">
                Have more questions? I'm here to help.
              </p>
              <Button 
                variant="outline" 
                className="border-[#2e88c7] text-[#2e88c7] hover:bg-[#2e88c7]/10"
                onClick={() => {
                  window.location.href = "mailto:info@makerbreakshop.com?subject=Question about Learn Lightburn Course";
                }}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Call to Action - Enhanced styling to match original */}
      <section className="py-16 mb-16 bg-[#2e88c7]">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row overflow-hidden rounded-2xl shadow-xl">
            {/* Left side with content */}
            <div className="md:w-1/2 bg-[#2e88c7] text-white p-8 md:p-12 flex flex-col justify-center relative overflow-hidden">
              {/* Subtle background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 20.83l2.83-2.83 1.41 1.41L1.41 22.24H0v-1.41zM0 3.06l2.83-2.83 1.41 1.41L1.41 4.47H0V3.06zm20 0l2.83-2.83 1.41 1.41L21.41 4.47h-1.41V3.06zm0 17.77l2.83-2.83 1.41 1.41-2.83 2.83h-1.41v-1.41zm0 17.77l2.83-2.83 1.41 1.41-2.83 2.83h-1.41v-1.41zM20 10.35l2.83-2.83 1.41 1.41-2.83 2.83h-1.41v-1.41zm-9.42 0l2.83 2.83-1.41 1.41-2.83-2.83V0h1.41zm9.42 8.94l2.83-2.83 1.41 1.41-2.83 2.83h-1.41v-1.41zm0 17.77l2.83-2.83 1.41 1.41-2.83 2.83h-1.41v-1.41zM38.59 0l-2.83 2.83-1.41-1.41L37.18 0h1.41zm0 17.77l-2.83 2.83-1.41-1.41 2.83-2.83h1.41v1.41zm0 17.77l-2.83 2.83-1.41-1.41 2.83-2.83h1.41v1.41zm0-26.71l-2.83 2.83-1.41-1.41 2.83-2.83h1.41v1.41zm20 28.12l2.83-2.83 1.41 1.41-2.83 2.83h-1.41v-1.41zm-9.42-9.42l2.83-2.83 1.41 1.41-2.83 2.83h-1.41v-1.41zm0 17.77l2.83-2.83 1.41 1.41-2.83 2.83h-1.41v-1.41zm-9.42-17.77l2.83-2.83 1.41 1.41-2.83 2.83H0v-1.41zM8.94 0l2.83 2.83-1.41 1.41L7.53 1.41 8.94 0zm19.88 0l-2.83 2.83 1.41 1.41 2.83-2.83-1.41-1.41zM8.94 30.53l2.83 2.83-1.41 1.41-2.83-2.83 1.41-1.41zm19.88 0l-2.83 2.83 1.41 1.41 2.83-2.83-1.41-1.41z'%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '40px 40px'
                }}></div>
              </div>
              
              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                  What Can Your Laser Really Do?
                </h2>
                
                <div className="prose prose-lg prose-invert space-y-4 mb-8">
                  <p>
                    Your laser sits there right now—an investment either generating value or collecting dust.
                  </p>
                  
                  <p>
                    This isn't just another course. You get immediate access to everything: the complete process, proven settings library, and templates that eliminate guesswork.
                  </p>
                  
                  <div className="flex items-center gap-2 py-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <p className="m-0">Eliminate expensive material waste</p>
                  </div>
                  
                  <div className="flex items-center gap-2 py-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <p className="m-0">Create professional results on day one</p>
                  </div>
                  
                  <div className="flex items-center gap-2 py-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <p className="m-0">30-day satisfaction guarantee</p>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <Button 
                    size="lg" 
                    className="bg-[#ff6b00] text-white hover:bg-[#ff6b00]/90 hover:scale-105 transition-all duration-300 font-semibold px-8 py-6 text-lg w-full md:w-auto"
                    onClick={() => {
                      window.location.href = podiaCheckoutUrl;
                    }}
                  >
                    Unlock Your Laser's Potential Now
                  </Button>
                  <p className="text-white/80 text-sm mt-4 italic">Start mastering your laser in minutes...</p>
                </div>
              </div>
            </div>
            
            {/* Right side with image */}
            <div className="md:w-1/2 bg-gray-100 relative min-h-[300px] md:min-h-0">
              <Image 
                src={`${supabaseImageUrlBase}/projects/c7b2ce-825-5c3-c676-4f2ace10426_dsc00625_1744054566683.webp`}
                alt="Laser project example" 
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#2e88c7]/80 to-transparent opacity-40"></div>
              <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur p-4 rounded-lg shadow-lg">
                <p className="font-medium text-[#2e88c7]">
                  "I was wasting so much material before this course. Now I get perfect results first time!"
                </p>
                <p className="text-sm mt-1 text-gray-600">- Jennifer K., Course Student</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 