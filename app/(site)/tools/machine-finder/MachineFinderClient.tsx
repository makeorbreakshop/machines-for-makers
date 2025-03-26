"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronRight, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Breadcrumb from "@/components/breadcrumb"

// Define the quiz questions
const questions = [
  {
    id: "machine-type",
    question: "What type of machine are you looking for?",
    options: [
      { id: "laser", label: "Laser Cutter/Engraver" },
      { id: "3d-printer", label: "3D Printer" },
      { id: "cnc", label: "CNC Machine" },
      { id: "not-sure", label: "I'm not sure" },
    ],
  },
  {
    id: "experience",
    question: "What is your experience level?",
    options: [
      { id: "beginner", label: "Beginner (Never used one before)" },
      { id: "intermediate", label: "Intermediate (Some experience)" },
      { id: "advanced", label: "Advanced (Experienced user)" },
      { id: "professional", label: "Professional (Business use)" },
    ],
  },
  {
    id: "budget",
    question: "What is your budget?",
    type: "slider",
    min: 0,
    max: 10000,
    step: 500,
    defaultValue: 2000,
    marks: [
      { value: 0, label: "$0" },
      { value: 2500, label: "$2,500" },
      { value: 5000, label: "$5,000" },
      { value: 7500, label: "$7,500" },
      { value: 10000, label: "$10,000+" },
    ],
  },
  {
    id: "materials",
    question: "What materials do you plan to work with most?",
    options: [
      { id: "wood", label: "Wood" },
      { id: "acrylic", label: "Acrylic/Plastic" },
      { id: "metal", label: "Metal" },
      { id: "fabric", label: "Fabric/Leather" },
      { id: "paper", label: "Paper/Cardboard" },
      { id: "multiple", label: "Multiple Materials" },
    ],
  },
  {
    id: "project-size",
    question: "What size projects do you plan to create?",
    options: [
      { id: "small", label: "Small (e.g., jewelry, miniatures)" },
      { id: "medium", label: "Medium (e.g., signs, small parts)" },
      { id: "large", label: "Large (e.g., furniture, large panels)" },
      { id: "various", label: "Various sizes" },
    ],
  },
  {
    id: "frequency",
    question: "How often will you use the machine?",
    options: [
      { id: "occasional", label: "Occasionally (few times a month)" },
      { id: "regular", label: "Regularly (few times a week)" },
      { id: "frequent", label: "Frequently (almost daily)" },
      { id: "production", label: "Production (multiple hours daily)" },
    ],
  },
  {
    id: "space",
    question: "What kind of space do you have available?",
    options: [
      { id: "desktop", label: "Desktop only" },
      { id: "small-dedicated", label: "Small dedicated area" },
      { id: "workshop", label: "Workshop/garage" },
      { id: "commercial", label: "Commercial space" },
    ],
  },
]

// Mock recommendations based on quiz answers
const mockRecommendations = {
  laser: [
    {
      id: "1",
      name: "xTool P2",
      image: "/placeholder.svg?height=200&width=200",
      price: 4999,
      rating: 5.0,
      match: 98,
      description:
        "The xTool P2 offers the best combination of power, precision, and user-friendly features for most users.",
      keyFeatures: ["55W CO2 laser", "600 x 300 mm work area", "Built-in camera", "Air assist"],
      bestFor: "Overall Best",
    },
    {
      id: "2",
      name: "Atomstack X20 Pro",
      image: "/placeholder.svg?height=200&width=200",
      price: 699,
      rating: 4.0,
      match: 92,
      description: "The Atomstack X20 Pro offers excellent value for beginners and hobbyists on a budget.",
      keyFeatures: ["20W diode laser", "410 x 400 mm work area", "Affordable", "Open frame design"],
      bestFor: "Budget Pick",
    },
    {
      id: "3",
      name: "Thunder Nova 35",
      image: "/placeholder.svg?height=200&width=200",
      price: 10350,
      rating: 4.5,
      match: 85,
      description:
        "The Thunder Nova 35 offers professional-grade performance and reliability for businesses and serious makers.",
      keyFeatures: ["60W CO2 laser", "900 x 600 mm work area", "Ruida controller", "Professional quality"],
      bestFor: "Professionals",
    },
  ],
  "3d-printer": [
    {
      id: "4",
      name: "Prusa MK4",
      image: "/placeholder.svg?height=200&width=200",
      price: 1099,
      rating: 4.8,
      match: 96,
      description:
        "The Prusa MK4 offers exceptional reliability and print quality for both beginners and experienced users.",
      keyFeatures: [
        "250 x 210 x 220 mm build volume",
        "Auto bed leveling",
        "Direct drive extruder",
        "Silent operation",
      ],
      bestFor: "Overall Best",
    },
    {
      id: "5",
      name: "Elegoo Mars 3",
      image: "/placeholder.svg?height=200&width=200",
      price: 299,
      rating: 4.5,
      match: 90,
      description:
        "The Elegoo Mars 3 is an affordable resin printer that delivers exceptional detail for small objects.",
      keyFeatures: ["MSLA resin printer", "143 x 89 x 175 mm build volume", "4K monochrome LCD", "High detail"],
      bestFor: "Budget Resin",
    },
    {
      id: "6",
      name: "Bambu Lab X1 Carbon",
      image: "/placeholder.svg?height=200&width=200",
      price: 1499,
      rating: 4.7,
      match: 88,
      description: "The Bambu Lab X1 Carbon combines high speed with excellent print quality and smart features.",
      keyFeatures: [
        "256 x 256 x 256 mm build volume",
        "500 mm/s print speed",
        "Multi-material capability",
        "AI camera monitoring",
      ],
      bestFor: "High Speed",
    },
  ],
  cnc: [
    {
      id: "7",
      name: "Onefinity Woodworker",
      image: "/placeholder.svg?height=200&width=200",
      price: 2199,
      rating: 4.6,
      match: 95,
      description: "The Onefinity Woodworker offers excellent rigidity and precision for woodworking projects.",
      keyFeatures: ["32 x 32 inch work area", "Ball screws", "Modular design", "Heavy-duty construction"],
      bestFor: "Overall Best",
    },
    {
      id: "8",
      name: "Sienci LongMill MK2",
      image: "/placeholder.svg?height=200&width=200",
      price: 1499,
      rating: 4.4,
      match: 91,
      description:
        "The Sienci LongMill MK2 is an affordable and capable CNC router for hobbyists and small businesses.",
      keyFeatures: ["30 x 30 inch work area", "NEMA 23 motors", "Open-source", "Easy assembly"],
      bestFor: "Budget Pick",
    },
    {
      id: "9",
      name: "Avid CNC Pro",
      image: "/placeholder.svg?height=200&width=200",
      price: 8999,
      rating: 4.9,
      match: 87,
      description: "The Avid CNC Pro is a professional-grade CNC router with exceptional rigidity and precision.",
      keyFeatures: [
        "4 x 4 foot work area",
        "Rack and pinion drive",
        "Heavy-duty construction",
        "Professional software",
      ],
      bestFor: "Professionals",
    },
  ],
}

export default function MachineFinderClient() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [showResults, setShowResults] = useState(false)
  const [machineType, setMachineType] = useState("laser")

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers({ ...answers, [questionId]: answer })

    // If it's the machine type question, update the machineType state
    if (questionId === "machine-type" && answer !== "not-sure") {
      setMachineType(answer)
    }

    // Move to the next question or show results if it's the last question
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowResults(true)
    }
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
  }

  const progress = ((currentStep + 1) / questions.length) * 100

  // Create breadcrumb items
  const breadcrumbItems = [
    { label: "Tools", href: "/tools" },
    { label: "Machine Finder", href: "/tools/machine-finder" },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Machine Finder</h1>
          <p className="text-lg text-muted-foreground">
            Answer a few questions to find the perfect machine for your needs.
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
            </CardHeader>
            <CardContent className="pt-4">
              <h2 className="text-xl font-bold mb-6">{questions[currentStep].question}</h2>

              {questions[currentStep].type === "slider" ? (
                <div className="px-4">
                  <div className="mb-8">
                    <Slider
                      defaultValue={[questions[currentStep].defaultValue]}
                      max={questions[currentStep].max}
                      min={questions[currentStep].min}
                      step={questions[currentStep].step}
                      onValueChange={(value) => setAnswers({ ...answers, [questions[currentStep].id]: value[0] })}
                    />
                  </div>
                  <div className="flex justify-between">
                    {questions[currentStep].marks.map((mark) => (
                      <div key={mark.value} className="text-center">
                        <div className="text-sm font-medium">{mark.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 text-center">
                    <div className="text-2xl font-bold">
                      ${answers[questions[currentStep].id] || questions[currentStep].defaultValue}
                    </div>
                    <div className="text-sm text-muted-foreground">Your Budget</div>
                  </div>
                </div>
              ) : (
                <RadioGroup
                  onValueChange={(value) => handleAnswer(questions[currentStep].id, value)}
                  className="space-y-3"
                >
                  {questions[currentStep].options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleAnswer(questions[currentStep].id, option.id)}
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-grow cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
                Previous
              </Button>
              {questions[currentStep].type === "slider" && (
                <Button
                  onClick={() => {
                    if (currentStep < questions.length - 1) {
                      setCurrentStep(currentStep + 1)
                    } else {
                      setShowResults(true)
                    }
                  }}
                >
                  {currentStep < questions.length - 1 ? "Next" : "See Results"}
                </Button>
              )}
            </CardFooter>
          </Card>
        ) : (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Your Personalized Recommendations</h2>
              <p className="text-muted-foreground">
                Based on your answers, here are the machines that best match your needs:
              </p>
            </div>

            <Tabs defaultValue={machineType} className="mb-8">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="laser">Laser Cutters</TabsTrigger>
                <TabsTrigger value="3d-printer">3D Printers</TabsTrigger>
                <TabsTrigger value="cnc">CNC Machines</TabsTrigger>
              </TabsList>

              {Object.entries(mockRecommendations).map(([type, recommendations]) => (
                <TabsContent key={type} value={type} className="mt-6">
                  <div className="space-y-6">
                    {recommendations.map((recommendation, index) => (
                      <Card key={recommendation.id} className={index === 0 ? "border-primary/50" : ""}>
                        <div
                          className={`p-4 flex items-center justify-between border-b ${index === 0 ? "bg-primary/10 border-primary/20" : ""}`}
                        >
                          <div>
                            <Badge
                              className={
                                index === 0 ? "bg-primary hover:bg-primary" : "bg-secondary hover:bg-secondary"
                              }
                            >
                              {recommendation.bestFor}
                            </Badge>
                            <div className="flex items-center mt-1">
                              <div className="font-bold text-lg">{recommendation.name}</div>
                              <Badge variant="outline" className="ml-2">
                                {recommendation.match}% Match
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${star <= recommendation.rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                                  strokeWidth={1.5}
                                />
                              ))}
                              <span className="text-sm ml-2">{recommendation.rating}</span>
                            </div>
                            <div className="font-bold text-lg mt-1">${recommendation.price.toLocaleString()}</div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="md:w-1/3">
                              <div className="relative h-48 w-full">
                                <Image
                                  src={recommendation.image || "/placeholder.svg"}
                                  alt={recommendation.name}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            </div>
                            <div className="md:w-2/3">
                              <p className="mb-4">{recommendation.description}</p>
                              <div className="mb-4">
                                <div className="font-medium mb-2">Key Features:</div>
                                <ul className="space-y-1">
                                  {recommendation.keyFeatures.map((feature, i) => (
                                    <li key={i} className="flex items-start">
                                      <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="flex gap-2">
                                <Button className="flex-1" asChild>
                                  <Link href={`/products/${recommendation.name.toLowerCase().replace(/\s+/g, "-")}`}>
                                    View Details
                                  </Link>
                                </Button>
                                <Button variant="outline" className="flex-1">
                                  Add to Compare
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/20 p-6 rounded-lg">
              <div>
                <h3 className="font-bold text-lg mb-1">Not seeing what you're looking for?</h3>
                <p className="text-muted-foreground">Try adjusting your preferences or browse all machines.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRestart}>
                  Restart Quiz
                </Button>
                <Button asChild>
                  <Link href="/compare">Browse All Machines</Link>
                </Button>
              </div>
            </div>

            <div className="mt-8 bg-primary/5 p-6 rounded-lg border border-primary/20">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <ChevronRight className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
                  <p className="mb-4">
                    Our comprehensive buying guides can help you understand the different types of machines and what to
                    look for.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/guides/choosing-a-laser">Laser Cutter Guide</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/guides/choosing-a-3d-printer">3D Printer Guide</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/guides/choosing-a-cnc">CNC Machine Guide</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

