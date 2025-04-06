import React from "react"
import Image from "next/image"
import Link from "next/link"
import { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Check, 
  X, 
  ArrowRight, 
  ChevronDown, 
  Flame, 
  Zap, 
  Settings, 
  Laptop
} from "lucide-react"
import Breadcrumb from "@/components/breadcrumb"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export const metadata: Metadata = {
  title: "Learn Lightburn for Lasers - From Beginner to Pro in Days Not Months",
  description: "Discover the exact Lightburn process for flawless cut and engraves so you can stop wasting expensive materials and time.",
}

export default function LearnLightburnPage() {
  // Create breadcrumb items
  const breadcrumbItems = [{ label: "Learn Lightburn", href: "/learn-lightburn" }]

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Hero Section */}
      <section className="py-12 md:py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            Laser Beginner to Pro in Days not Months
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Discover the exact Lightburn process for flawless cut and engraves so you can stop wasting expensive materials and time.
          </p>
          <div className="max-w-xs mx-auto mb-8">
            <div className="bg-muted rounded-md p-4 text-sm italic">
              <p className="mb-2">
                <span className="block">I learned a lot from these videos especially</span>
                <span className="block">not knowing anything about this space!</span>
              </p>
              <p className="font-semibold text-right">-Derrick</p>
            </div>
          </div>
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider mb-2">Official Course Provider For</p>
            <div className="flex justify-center">
              {/* Placeholder for partner logos */}
              <div className="h-12 w-28 bg-muted rounded-md flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Partner Logo</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Does This Sound Like You Section */}
      <section className="py-12 bg-muted/20 rounded-xl mb-16">
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
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <p className="text-lg">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-lg text-center italic">You're not alone...</p>
        </div>
      </section>
      
      {/* Story Section */}
      <section className="py-12 mb-16 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-4xl font-bold mb-6">
            My $2,000 Laser Cutter Was a Complete Waste of Money... Until I Discovered This Simple System That Changed Everything
          </h2>
          <Button size="lg" className="bg-primary text-white hover:bg-primary/90">
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
          <div className="bg-muted/30 p-4 rounded-md italic">
            <p className="mb-2">"How do I fix this alignment issue?"</p>
            <p className="mb-2">"Why won't my laser cut all the way through?"</p>
            <p className="mb-2">"How do I get rid of these burn marks?"</p>
            <p>"Why won't this #$%&** work!"</p>
          </div>
          <p className="italic">That's when it hit me.</p>
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
          <p className="italic">
            The secret to laser cutting success isn't becoming more technical.
          </p>
          <p className="font-bold">
            It's following a clear roadmap for artists and entrepreneurs, not tech specialists.
          </p>
        </div>
      </section>
      
      {/* Personal Story Section */}
      <section className="py-12 mb-16 max-w-4xl mx-auto bg-muted/20 rounded-xl p-8">
        <div className="prose prose-lg max-w-3xl mx-auto space-y-6">
          <p className="italic text-center text-xl font-medium">
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
        </div>
      </section>
      
      {/* YouTube Testimonials */}
      <section className="py-12 mb-16 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          A few comments from my free tutorials on YouTube
        </h2>
        <h3 className="text-lg md:text-xl font-medium text-center text-muted-foreground mb-8">
          (12 million views and counting...)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              text: "WOW the video I've been looking for about this model of laser finally showed up in my recommended videos! I can't thank you enough for this video.",
              author: "LaserNewbie12"
            },
            {
              text: "You are a life saver! Just saved me hours of trial and error. Subscribed!",
              author: "MakerJane"
            },
            {
              text: "I've been watching dozens of videos and yours is BY FAR the clearest explanation. Thank you!",
              author: "WoodWorx"
            },
            {
              text: "Just got my first laser yesterday and your video got me cutting within an hour. Amazing content!",
              author: "FirstTimeLaser"
            }
          ].map((testimonial, i) => (
            <div key={i} className="bg-muted/20 p-6 rounded-xl">
              <p className="italic mb-4">{testimonial.text}</p>
              <p className="font-medium text-right">- {testimonial.author}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* How to Learn Lightburn */}
      <section className="py-12 mb-16 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
          How do you ACTUALLY learn Lightburn without wasting time?
        </h2>
        
        <div className="prose prose-lg max-w-3xl mx-auto">
          <p>The secret to mastering your laser is simple.</p>
          <ol className="pl-5 space-y-2">
            <li>Learn every setting and feature Lightburn has to offer.</li>
            <li>Focus just on the ones that matter</li>
            <li>Ignore everything else.</li>
          </ol>
          <p>
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
        
        <div className="mt-8 bg-muted/20 rounded-xl p-8">
          <p className="text-lg mb-4">Sign up today so you can:</p>
          <div className="space-y-3">
            {[
              "Trade endless YouTube searches for a complete, tested framework built by someone who's faced your exact challenges",
              "Navigate Lightburn with confidence and ease, even if you consider yourself \"non-technical\"",
              "Gain ongoing support and resources that take you beyond basics to true mastery",
              "Save hundreds in wasted materials with tested, reliable power and speed configurations for every project",
              "Say goodbye to blurry engravings and incomplete cuts with mastery of proper material positioning",
              "Replace software confusion with logical workflows that make every project feel effortless",
              "Maximize your current laser's capabilities, producing results that rival machines costing thousands more"
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Triple Beam Process */}
      <section className="py-12 mb-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Introducing The Triple Beam Process
          </h2>
          <p className="text-xl font-medium text-muted-foreground">
            From Frustration to Flawless Results in 3 Simple Steps
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-primary text-white p-4">
                <h3 className="text-xl font-bold mb-2">Beam 1: The Design</h3>
              </div>
              <div className="p-6">
                <p className="text-lg">
                  Transform your ideas into laser-ready files—whether creating from scratch or importing existing artwork.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-primary text-white p-4">
                <h3 className="text-xl font-bold mb-2">Beam 2: The Settings</h3>
              </div>
              <div className="p-6">
                <p className="text-lg">
                  Eliminate guesswork with proven settings that work every time. Use the test file process to focus in on what matters!
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-primary text-white p-4">
                <h3 className="text-xl font-bold mb-2">Beam 3: The Machine</h3>
              </div>
              <div className="p-6">
                <p className="text-lg">
                  Learn how to properly connect, position, and operate your laser for perfect results every time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="text-center mt-12">
          <h3 className="text-xl font-bold mb-4">The best part?</h3>
          <p className="text-lg font-medium mb-6">
            You can implement the Triple Beam Process in just a few evenings — perfect if your trying to balance full-time work with a laser side hustle.
          </p>
          <Button size="lg" className="bg-primary text-white hover:bg-primary/90">
            Sign Up Now
          </Button>
        </div>
        
        <div className="mt-12 max-w-xl mx-auto bg-muted/20 p-6 rounded-xl text-center">
          <p className="italic mb-2">Easy to follow modules</p>
          <p className="font-semibold">-Steve Mosely (MakingAtHome)</p>
        </div>
      </section>
      
      {/* Course Features */}
      <section className="py-12 mb-16 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">
          Everything you Get Access To
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Processes",
              description: "Follow proven frameworks that replace guesswork with reliable results every time.",
              icon: <Settings className="h-12 w-12 text-primary" />
            },
            {
              title: "Video Training",
              description: "Master the Triple Beam Process with on demand video training.",
              icon: <Laptop className="h-12 w-12 text-primary" />
            },
            {
              title: "Test Files",
              description: "Dial in your perfect settings for any machine, material, and cut type.",
              icon: <Zap className="h-12 w-12 text-primary" />
            },
            {
              title: "Community Support",
              description: "Connect with fellow laser lovers to share ideas and get help when you need it.",
              icon: <Check className="h-12 w-12 text-primary" />
            },
            {
              title: "Material Libraries",
              description: "Gain instant access to material settings libraries.",
              icon: <Settings className="h-12 w-12 text-primary" />
            },
            {
              title: "Design Files",
              description: "Ready-to-use designs that speed up your project workflow.",
              icon: <Laptop className="h-12 w-12 text-primary" />
            },
            {
              title: "Lifetime Access",
              description: "Enjoy unlimited access and free updates for as long as the course exists.",
              icon: <Check className="h-12 w-12 text-primary" />
            }
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 bg-muted/10 rounded-xl">
              <div className="mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Bonus #1 */}
      <section className="py-12 mb-16 max-w-4xl mx-auto bg-muted/20 rounded-xl p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/3 flex justify-center">
            <div className="rounded-full bg-primary text-white h-32 w-32 flex items-center justify-center text-xl font-bold">
              BONUS #1
            </div>
          </div>
          <div className="md:w-2/3">
            <h2 className="text-2xl font-bold mb-4">Project Cost Calculator</h2>
            <p className="mb-4">Stop guessing. Know exactly what each project costs and what to charge.</p>
            <ul className="space-y-2">
              {[
                "Track material costs, machine time, and labor for perfect project pricing",
                "Eliminate undercharging with precise expense tracking for each design",
                "Account for test pieces and failed attempts in your final pricing",
                "Calculate true profit margins on every product you make"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      
      {/* Testimonial */}
      <section className="py-12 mb-16 max-w-xl mx-auto text-center">
        <div className="bg-muted/20 p-6 rounded-xl">
          <p className="italic mb-2">The pace of the information presented was the biggest plus for me!</p>
          <p className="font-semibold">-Carl</p>
        </div>
      </section>
      
      {/* Bonus #2 */}
      <section className="py-12 mb-16 max-w-4xl mx-auto bg-muted/20 rounded-xl p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/3 flex justify-center">
            <div className="rounded-full bg-primary text-white h-32 w-32 flex items-center justify-center text-xl font-bold">
              BONUS #2
            </div>
          </div>
          <div className="md:w-2/3">
            <h2 className="text-2xl font-bold mb-4">Laser Resource Directory</h2>
            <p className="mb-4">Everything I use daily to create professional projects faster and cheaper.</p>
            <ul className="space-y-2">
              {[
                "Access my curated list of affordable material suppliers for wood, acrylic, and tumblers",
                "Get my top AI design tools that create sellable designs in minutes (even for non-designers)",
                "Save with exclusive discount codes for essential supplies and software"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      
      {/* About the Instructor */}
      <section className="py-12 mb-16 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="md:w-1/3">
            <div className="h-64 w-64 md:h-80 md:w-80 bg-muted rounded-xl relative mx-auto">
              {/* Placeholder for instructor image */}
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Instructor Photo
              </div>
            </div>
          </div>
          <div className="md:w-2/3">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Hey there, I'm Brandon
            </h2>
            <div className="prose prose-lg">
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
      </section>
      
      {/* YouTube Comments */}
      <section className="py-12 mb-16 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          A few more recent YouTube comments
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              text: "I've been struggling for months trying to figure this out. Your explanation just fixed my problem in 5 minutes!",
              author: "CreativeGenius"
            },
            {
              text: "I was ready to return my laser before finding your channel. Now I'm actually making things and having fun!",
              author: "LaserNewbie"
            },
            {
              text: "Your test grid method just saved me so much time and material. Thank you!",
              author: "EtsySeller22"
            },
            {
              text: "No one else explains this stuff so clearly. I feel like I finally understand what I'm doing.",
              author: "WoodworkerTom"
            }
          ].map((testimonial, i) => (
            <div key={i} className="bg-muted/20 p-6 rounded-xl">
              <p className="italic mb-4">{testimonial.text}</p>
              <p className="font-medium text-right">- {testimonial.author}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Project Examples */}
      <section className="py-12 mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          The Type of Stuff We Will Make!
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-xl flex items-center justify-center">
              <div className="text-muted-foreground">
                Project Example
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Is This Course Right For You */}
      <section className="py-12 mb-16 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          Is This Course Right For You?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-muted/10 p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center text-green-600">
              <Check className="h-6 w-6 mr-2" />
              This is for you if:
            </h3>
            <ul className="space-y-3">
              {[
                "You have a laser cutter (any type) and Lightburn software",
                "You're wasting materials and time on failed projects",
                "You're tired of piecing together YouTube tutorials",
                "You want to create products, not troubleshoot equipment"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-muted/10 p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center text-red-500">
              <X className="h-6 w-6 mr-2" />
              This is not for you if:
            </h3>
            <ul className="space-y-3">
              {[
                "You already use Lightburn confidently",
                "You don't own a laser or Lightburn software",
                "You're seeking business strategies, not technical skills",
                "You prefer figuring things out through trial and error"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      
      {/* Money Back Guarantee */}
      <section className="py-12 mb-16 max-w-4xl mx-auto bg-muted/20 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-6">
          If you don't like the course, I'll give you a full refund. No questions asked.
        </h2>
        <p className="text-lg max-w-3xl mx-auto">
          Here's the deal: if you don't like the course, I'll give you a full refund with 30 days. No questions asked. Period. But do me a favor: at least give it a shot first before asking for a refund.
        </p>
      </section>
      
      {/* FAQ Section */}
      <section className="py-12 mb-16 max-w-4xl mx-auto">
        <Accordion type="single" collapsible className="w-full space-y-4">
          {[
            {
              question: "Will this work for my specific laser machine?",
              answer: "Yes! Whether you've got a budget diode laser or a fancy professional system, the Triple Beam Process works with any machine that runs Lightburn. I've tested these methods on dozens of different lasers, from Ortur and xTool to high-end Thunder Lasers."
            },
            {
              question: "I'm not tech-savvy at all. Will I be able to follow along?",
              answer: "Don't worry about being \"technical\" - many of our best students had zero tech background. I've designed this course specifically for regular people who want results, not tech specialists. Everything is broken down into simple, clear steps anyone can follow."
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
            },
            {
              question: "What makes your method different from others?",
              answer: "The Triple Beam Process connects design, settings, and operation as one integrated system, not as separate challenges. Instead of random tips and tricks, you get a repeatable framework that works for any project on any machine."
            },
            {
              question: "Do I need to be artistic or good at design?",
              answer: "Not at all! The included templates and step-by-step design processes work regardless of your artistic skills. I've helped plenty of self-described \"non-creative\" people create professional-looking products their customers love."
            },
            {
              question: "What if I'm not satisfied with the course?",
              answer: "You're covered by a 30-day satisfaction guarantee. If you're not happy, just let me know and I'll refund you fully. No hoops to jump through, no hard feelings."
            },
            {
              question: "How do I access the course after purchasing?",
              answer: "You'll get immediate lifetime access to everything through our online platform. Watch videos, download resources, and join the community from any device — it's yours for as long as the course exists."
            },
            {
              question: "Does this work for both cutting and engraving projects?",
              answer: "Yep! The course covers everything from perfect clean-edge cuts to detailed engravings with proper depth and contrast. You'll master both skills across various materials."
            },
            {
              question: "Will this help me reduce costs?",
              answer: "The course typically pays for itself in saved materials within weeks. Our testing process and settings library eliminate the costly trial-and-error that burns through expensive materials."
            },
            {
              question: "Can I really make money with my laser after taking this course?",
              answer: "Many students turn their laser skills into profitable side businesses within weeks of completing the course. While results depend on your effort and local market, you'll have the technical foundation to create products people will actually pay for. The efficiency and quality you'll learn are essential for profitability."
            },
            {
              question: "When does the course start?",
              answer: "Right away! The moment you purchase, you'll have access to all modules. It's completely self-paced, so you can jump straight to what matters most to you."
            },
            {
              question: "Are there any other costs beyond the course fee?",
              answer: "Nope! Your one-time payment covers everything — lifetime access, future updates, the community, and all bonus resources. The only additional costs would be materials for your projects, but you'll actually save on those by eliminating wasteful mistakes."
            }
          ].map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-semibold px-4 hover:no-underline hover:bg-muted/20 rounded-lg transition-all">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2 pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      
      {/* Call to Action */}
      <section className="py-12 mb-16 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          What Can Your Laser Really Do?
        </h2>
        <Button size="lg" className="bg-primary text-white hover:bg-primary/90 mb-12">
          Sign Up Now
        </Button>
        
        <div className="prose prose-lg max-w-3xl mx-auto">
          <p>
            Your laser sits there right now—an investment either generating value or collecting dust.
          </p>
          <p>
            This isn't just another course dripping content week by week. You get immediate access to everything: the complete process, proven settings library, and templates that eliminate guesswork.
          </p>
          <p>
            The question is simple: Do you want to keep wasting expensive materials on trial and error? Or would you prefer creating professional results today, turning frustration into profitable projects?
          </p>
          <p>
            Every day you wait is another day of unrealized potential. With our 30-day satisfaction guarantee, the only risk is continuing down the path you're on now.
          </p>
          <p>
            Your laser's potential is waiting. Unlock it today.
          </p>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-4">
            <Link href="/" className="text-xl font-bold">
              Make or Break Shop
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 Make or Break Shop</p>
        </div>
      </footer>
    </div>
  )
} 