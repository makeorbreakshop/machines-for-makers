"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, Star, ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Breadcrumb from "@/components/breadcrumb"

// Define the 10-question quiz structure
const questions = [
  {
    id: "materials",
    question: "What materials will you work with primarily?",
    type: "radio",
    options: [
      { 
        id: "wood-organic", 
        label: "Wood, leather, paper, cardboard, fabric",
        description: "Natural and organic materials"
      },
      { 
        id: "clear-acrylic", 
        label: "Clear acrylic, glass, ceramic, stone",
        description: "Transparent and hard materials"
      },
      { 
        id: "dark-plastics", 
        label: "Dark plastics, painted surfaces",
        description: "Pigmented synthetic materials"
      },
      { 
        id: "bare-metals", 
        label: "Bare metals (steel, aluminum, brass)",
        description: "Uncoated metal surfaces"
      },
      { 
        id: "coated-metals", 
        label: "Coated metals (anodized, painted)",
        description: "Metal with surface treatments"
      },
      { 
        id: "electronics", 
        label: "Electronics/PCBs, delicate materials",
        description: "Precision and sensitive items"
      },
      { 
        id: "mixed-materials", 
        label: "Multiple material types regularly",
        description: "Versatility across categories"
      }
    ]
  },
  {
    id: "thickness",
    question: "What's the thickest material you need to cut?",
    type: "radio",
    options: [
      { id: "engraving-only", label: "Engraving/marking only (surface)", description: "Surface treatment only" },
      { id: "thin-materials", label: "Thin materials (up to 3mm)", description: "Paper, thin wood, light plastics" },
      { id: "medium-thickness", label: "Medium thickness (3-6mm)", description: "Standard wood, acrylic sheets" },
      { id: "thick-materials", label: "Thick materials (6-12mm)", description: "Heavy wood, thick acrylic" },
      { id: "very-thick", label: "Very thick (12mm+)", description: "Industrial thickness materials" },
      { id: "variable-thickness", label: "Variable thicknesses", description: "Wide range of material depths" }
    ]
  },
  {
    id: "speed",
    question: "How fast do you need to work?",
    type: "radio",
    options: [
      { id: "speed-no-matter", label: "Speed doesn't matter (quality focus)", description: "Prioritize precision over time" },
      { id: "moderate-speed", label: "Moderate speed is fine", description: "Balanced approach" },
      { id: "fast-turnaround", label: "Fast turnaround important", description: "Quick project completion" },
      { id: "high-speed", label: "High-speed production critical", description: "Business efficiency needs" },
      { id: "batch-processing", label: "Batch processing efficiency needed", description: "Volume production capability" }
    ]
  },
  {
    id: "usage-frequency",
    question: "How often will you use this laser?",
    type: "radio",
    options: [
      { id: "occasional-hobby", label: "Occasional hobby (weekends)", description: "Light personal use" },
      { id: "regular-hobby", label: "Regular hobby (few hours/week)", description: "Consistent personal projects" },
      { id: "side-business", label: "Side business (few hours daily)", description: "Small commercial operation" },
      { id: "full-time-business", label: "Full-time business (40+ hours/week)", description: "Professional daily use" },
      { id: "high-volume", label: "High-volume production (continuous)", description: "Industrial operation" }
    ]
  },
  {
    id: "technical-comfort",
    question: "What's your technical comfort level?",
    type: "radio",
    options: [
      { id: "plug-and-play", label: "Want plug-and-play operation", description: "Minimal setup required" },
      { id: "basic-setup", label: "Comfortable with basic setup", description: "Some assembly expected" },
      { id: "diy-tinkering", label: "Enjoy DIY projects and tinkering", description: "Hands-on approach welcome" },
      { id: "technical-expert", label: "Technical expert (engineering background)", description: "Advanced customization capable" }
    ]
  },
  {
    id: "workspace",
    question: "What's your workspace situation?",
    type: "radio",
    options: [
      { id: "indoor-apartment", label: "Indoor apartment/office (quiet needed)", description: "Noise and ventilation concerns" },
      { id: "garage-basement", label: "Garage/basement (some ventilation possible)", description: "Semi-controlled environment" },
      { id: "dedicated-workshop", label: "Dedicated workshop (full ventilation available)", description: "Proper maker space setup" },
      { id: "commercial-facility", label: "Commercial facility (industrial setup)", description: "Professional environment" }
    ]
  },
  {
    id: "project-sizes",
    question: "What project sizes do you typically work on?",
    type: "radio",
    options: [
      { id: "small-items", label: "Small items (jewelry, keychains, phone cases)", description: "Precision detail work" },
      { id: "medium-projects", label: "Medium projects (signs, laptop covers, small panels)", description: "Standard craft projects" },
      { id: "large-projects", label: "Large projects (big signs, furniture panels)", description: "Substantial fabrication" },
      { id: "variable-sizes", label: "Variable sizes (need flexibility)", description: "Range of project scales" },
      { id: "long-materials", label: "Long materials (need pass-through)", description: "Extended length capability" }
    ]
  },
  {
    id: "safety-environment",
    question: "What safety/environment requirements do you have?",
    type: "radio",
    options: [
      { id: "must-be-enclosed", label: "Must be enclosed for safety", description: "Full containment required" },
      { id: "quiet-operation", label: "Quiet operation required", description: "Low noise essential" },
      { id: "open-system-ok", label: "Open system OK with safety gear", description: "Protective equipment acceptable" },
      { id: "industrial-environment", label: "Industrial environment (noise/safety not critical)", description: "No special requirements" }
    ]
  },
  {
    id: "special-capabilities",
    question: "Do you need any special capabilities?",
    type: "checkbox",
    options: [
      { id: "camera-alignment", label: "Camera alignment for precision placement", description: "Visual positioning system" },
      { id: "rotary-attachment", label: "Rotary attachment for cylindrical objects", description: "Round object capability" },
      { id: "multi-color-engraving", label: "Multi-color/variable depth engraving", description: "Complex engraving patterns" },
      { id: "pass-through-capability", label: "Pass-through for long materials", description: "Extended length processing" },
      { id: "automatic-detection", label: "Automatic material detection", description: "Smart material sensing" },
      { id: "none-special", label: "None of these", description: "Standard capabilities sufficient" }
    ]
  },
  {
    id: "budget",
    question: "What's your total budget including setup?",
    type: "radio",
    options: [
      { id: "under-2k", label: "Under $2,000", description: "Entry-level investment" },
      { id: "2k-5k", label: "$2,000 - $5,000", description: "Mid-range investment" },
      { id: "5k-15k", label: "$5,000 - $15,000", description: "Professional investment" },
      { id: "15k-50k", label: "$15,000 - $50,000", description: "Commercial investment" },
      { id: "50k-plus", label: "$50,000+", description: "Industrial investment" },
      { id: "budget-flexible", label: "Budget is flexible for right solution", description: "Value-focused approach" }
    ]
  }
]

interface LaserPickerAnswers {
  materials?: string
  thickness?: string
  speed?: string
  "usage-frequency"?: string
  "technical-comfort"?: string
  workspace?: string
  "project-sizes"?: string
  "safety-environment"?: string
  "special-capabilities"?: string[]
  budget?: string
}

interface Machine {
  id: string
  "Machine Name": string
  Company: string
  "Laser Type A": string
  "Laser Power A": string
  "Work Area": string
  "Machine Size": string
  Price: number
  "Price Category": string
  Image: string
  Camera: string
  Wifi: string
  Enclosure: string
  Passthrough: string
  "Affiliate Link": string
  "YouTube Review": string
  "Excerpt (Short)": string
  Award: string
  Rating: number
  recommendationType?: "perfect" | "alternative" | "growth"
  explanation?: {
    whyThisMatches: string[]
    tradeOffs: string[]
    growthPath?: string
  }
}

export default function LaserPickerClient() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<LaserPickerAnswers>({})
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Machine[]>([])
  const [machineCount, setMachineCount] = useState(168) // Total laser cutters

  const handleAnswer = (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)

    // Move to next question or show results
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowResults(true)
      fetchRecommendations(newAnswers)
    }
  }

  const handleCheckboxAnswer = (questionId: string, optionId: string, checked: boolean) => {
    const currentAnswers = answers[questionId as keyof LaserPickerAnswers] as string[] || []
    let newAnswers: string[]
    
    if (checked) {
      newAnswers = [...currentAnswers, optionId]
    } else {
      newAnswers = currentAnswers.filter(id => id !== optionId)
    }
    
    setAnswers({ ...answers, [questionId]: newAnswers })
  }

  const fetchRecommendations = async (quizAnswers: LaserPickerAnswers) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/laser-picker/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: quizAnswers }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }
      
      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      // For now, we'll continue without recommendations
      setRecommendations([])
    }
    setIsLoading(false)
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleRestart = () => {
    setCurrentStep(0)
    setAnswers({})
    setShowResults(false)
    setRecommendations([])
  }

  const progress = ((currentStep + 1) / questions.length) * 100

  // Create breadcrumb items
  const breadcrumbItems = [
    { label: "Tools", href: "/tools" },
    { label: "Laser Picker", href: "/tools/laser-picker" },
  ]

  const currentQuestion = questions[currentStep]

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Laser Picker Quiz</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Answer 10 questions to get personalized laser cutter recommendations based on your specific needs, materials, and workspace.
          </p>
        </div>

        {!showResults ? (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center mb-2">
                <CardTitle>
                  Question {currentStep + 1} of {questions.length}
                </CardTitle>
                <Badge variant="outline">{Math.round(progress)}% Complete</Badge>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-sm text-muted-foreground mt-2">
                Filtering {machineCount} laser cutters to find your perfect match
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <h2 className="text-xl font-bold mb-6">{currentQuestion.question}</h2>

              {currentQuestion.type === "radio" ? (
                <RadioGroup
                  onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
                  className="space-y-3"
                  value={answers[currentQuestion.id as keyof LaserPickerAnswers] as string}
                >
                  {currentQuestion.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => handleAnswer(currentQuestion.id, option.id)}
                    >
                      <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                      <div className="flex-grow cursor-pointer">
                        <Label htmlFor={option.id} className="font-medium cursor-pointer text-base">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => {
                    const currentAnswers = answers[currentQuestion.id as keyof LaserPickerAnswers] as string[] || []
                    const isChecked = currentAnswers.includes(option.id)
                    
                    return (
                      <div
                        key={option.id}
                        className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => handleCheckboxAnswer(currentQuestion.id, option.id, !isChecked)}
                      >
                        <Checkbox 
                          id={option.id} 
                          checked={isChecked}
                          onCheckedChange={(checked) => 
                            handleCheckboxAnswer(currentQuestion.id, option.id, !!checked)
                          }
                          className="mt-1"
                        />
                        <div className="flex-grow cursor-pointer">
                          <Label htmlFor={option.id} className="font-medium cursor-pointer text-base">
                            {option.label}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
                Previous
              </Button>
              {currentQuestion.type === "checkbox" && (
                <Button
                  onClick={() => {
                    if (currentStep < questions.length - 1) {
                      setCurrentStep(currentStep + 1)
                    } else {
                      setShowResults(true)
                      fetchRecommendations(answers)
                    }
                  }}
                  disabled={(answers[currentQuestion.id as keyof LaserPickerAnswers] as string[] || []).length === 0}
                >
                  {currentStep < questions.length - 1 ? "Next" : "Get Recommendations"}
                </Button>
              )}
            </CardFooter>
          </Card>
        ) : (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Your Personalized Recommendations
              </h2>
              <p className="text-muted-foreground">
                Based on your answers, here are the laser cutters that best match your specific needs.
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Finding your perfect laser cutter matches...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <Card className="mb-8">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <p className="text-lg mb-4">
                      We're still building the recommendation engine! The database integration is working, but the filtering logic is coming next.
                    </p>
                    <p className="text-muted-foreground">
                      For now, check out our comprehensive <Link href="/products" className="text-primary underline">product listings</Link> to explore all available laser cutters.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {recommendations.map((machine, index) => (
                  <Card key={machine.id} className={index === 0 ? "border-primary/50" : ""}>
                    <div
                      className={`p-4 flex items-center justify-between border-b ${
                        index === 0 ? "bg-primary/10 border-primary/20" : ""
                      }`}
                    >
                      <div>
                        <Badge
                          className={
                            index === 0 ? "bg-primary hover:bg-primary" : "bg-secondary hover:bg-secondary"
                          }
                        >
                          {machine.recommendationType === "perfect" ? "Perfect Match" : 
                           machine.recommendationType === "alternative" ? "Alternative" : "Growth Path"}
                        </Badge>
                        <div className="flex items-center mt-1">
                          <div className="font-bold text-lg">{machine["Machine Name"]}</div>
                          <Badge variant="outline" className="ml-2">
                            {machine.Company}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        {machine.Rating > 0 && (
                          <div className="flex items-center justify-end mb-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= machine.Rating ? "text-amber-400 fill-amber-400" : "text-gray-300"
                                }`}
                                strokeWidth={1.5}
                              />
                            ))}
                            <span className="text-sm ml-2">{machine.Rating}</span>
                          </div>
                        )}
                        <div className="font-bold text-lg">${machine.Price?.toLocaleString() || "TBD"}</div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3">
                          <div className="relative h-48 w-full bg-muted rounded-lg overflow-hidden">
                            {machine.Image ? (
                              <Image
                                src={machine.Image}
                                alt={machine["Machine Name"]}
                                fill
                                className="object-contain"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                No Image
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="md:w-2/3">
                          {machine["Excerpt (Short)"] && (
                            <p className="mb-4">{machine["Excerpt (Short)"]}</p>
                          )}
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <span className="font-medium">Laser Type:</span>{" "}
                              {machine["Laser Type A"] || "TBD"}
                            </div>
                            <div>
                              <span className="font-medium">Work Area:</span>{" "}
                              {machine["Work Area"] || "TBD"}
                            </div>
                            <div>
                              <span className="font-medium">Power:</span>{" "}
                              {machine["Laser Power A"] || "TBD"}
                            </div>
                            <div>
                              <span className="font-medium">Size:</span>{" "}
                              {machine["Machine Size"] || "TBD"}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {machine.Camera === "Yes" && <Badge variant="outline">Camera</Badge>}
                            {machine.Wifi === "Yes" && <Badge variant="outline">WiFi</Badge>}
                            {machine.Enclosure === "Yes" && <Badge variant="outline">Enclosed</Badge>}
                            {machine.Passthrough === "Yes" && <Badge variant="outline">Pass-through</Badge>}
                            {machine.Award && <Badge className="bg-amber-100 text-amber-800">{machine.Award}</Badge>}
                          </div>
                          {/* Why This Matches Section */}
                          {machine.explanation && (
                            <div className="mb-4 p-4 bg-muted/20 rounded-lg">
                              <h4 className="font-semibold mb-2 text-primary">Why This Matches Your Needs:</h4>
                              <ul className="space-y-1 text-sm">
                                {machine.explanation.whyThisMatches.map((reason, i) => (
                                  <li key={i} className="flex items-start">
                                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                              
                              {/* Trade-offs section */}
                              {machine.explanation.tradeOffs.length > 0 && (
                                <div className="mt-3">
                                  <h5 className="font-medium mb-1 text-amber-700">Consider These Trade-offs:</h5>
                                  <ul className="space-y-1 text-sm">
                                    {machine.explanation.tradeOffs.map((tradeOff, i) => (
                                      <li key={i} className="flex items-start">
                                        <span className="text-amber-600 mr-2">⚠️</span>
                                        <span className="text-amber-800">{tradeOff.replace("⚠️ ", "")}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Growth path */}
                              {machine.explanation.growthPath && (
                                <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-300">
                                  <div className="text-sm">
                                    <span className="font-medium text-blue-800">Growth Strategy: </span>
                                    <span className="text-blue-700">{machine.explanation.growthPath}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2">
                            {machine["Affiliate Link"] && (
                              <Button asChild>
                                <Link href={machine["Affiliate Link"]} target="_blank" rel="noopener noreferrer">
                                  View Product <ExternalLink className="ml-1 h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            {machine["YouTube Review"] && (
                              <Button variant="outline" asChild>
                                <Link href={machine["YouTube Review"]} target="_blank" rel="noopener noreferrer">
                                  Watch Review
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/20 p-6 rounded-lg mt-8">
              <div>
                <h3 className="font-bold text-lg mb-1">Not seeing what you're looking for?</h3>
                <p className="text-muted-foreground">Try adjusting your preferences or browse all machines.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRestart}>
                  Retake Quiz
                </Button>
                <Button asChild>
                  <Link href="/products">Browse All Lasers</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}