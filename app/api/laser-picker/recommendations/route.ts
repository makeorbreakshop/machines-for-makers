import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { generateRecommendationExplanation } from "@/lib/services/quiz-explanation"

export const runtime = "nodejs"

interface QuizAnswers {
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

// Map quiz answers to database filters
function buildDatabaseFilters(answers: QuizAnswers) {
  const filters: any = {}
  
  // Material-based laser type filtering
  if (answers.materials) {
    switch (answers.materials) {
      case "wood-organic":
        filters.laserTypes = ["CO2-Glass", "CO2-RF"]
        break
      case "clear-acrylic":
        filters.laserTypes = ["CO2-Glass", "CO2-RF"]
        break
      case "dark-plastics":
        filters.laserTypes = ["Diode", "CO2-Glass", "CO2-RF"]
        break
      case "bare-metals":
        filters.laserTypes = ["Fiber", "MOPA"]
        break
      case "coated-metals":
        filters.laserTypes = ["Fiber", "MOPA", "CO2-Glass"]
        break
      case "electronics":
        filters.laserTypes = ["Fiber", "MOPA"]
        break
      case "mixed-materials":
        // Prioritize dual-laser capability - for now, show all types
        filters.laserTypes = ["CO2-Glass", "CO2-RF", "Diode", "Fiber", "MOPA"]
        break
    }
  }

  // Work area filtering based on project sizes
  if (answers["project-sizes"]) {
    switch (answers["project-sizes"]) {
      case "small-items":
        // Look for work areas with dimensions roughly 100-200mm
        filters.workAreaFilter = "small" // We'll implement this in the query
        break
      case "medium-projects":
        filters.workAreaFilter = "medium" // 300-500mm range
        break
      case "large-projects":
        filters.workAreaFilter = "large" // 700mm+ range
        break
      case "variable-sizes":
        filters.workAreaFilter = "any"
        break
      case "long-materials":
        filters.requiresPassthrough = true
        break
    }
  }

  // Budget filtering (for final recommendation grouping)
  if (answers.budget) {
    switch (answers.budget) {
      case "under-2k":
        filters.priceRange = [0, 2000]
        break
      case "2k-5k":
        filters.priceRange = [2000, 5000]
        break
      case "5k-15k":
        filters.priceRange = [5000, 15000]
        break
      case "15k-50k":
        filters.priceRange = [15000, 50000]
        break
      case "50k-plus":
        filters.priceRange = [50000, 999999]
        break
      case "budget-flexible":
        filters.priceRange = [0, 999999]
        break
    }
  }

  // Special capabilities
  if (answers["special-capabilities"]) {
    const capabilities = answers["special-capabilities"]
    if (capabilities.includes("camera-alignment")) {
      filters.requiresCamera = true
    }
    if (capabilities.includes("pass-through-capability")) {
      filters.requiresPassthrough = true
    }
    // Add more capability filters as needed
  }

  // Safety/environment requirements
  if (answers["safety-environment"]) {
    switch (answers["safety-environment"]) {
      case "must-be-enclosed":
        filters.requiresEnclosure = true
        break
      case "quiet-operation":
        // We'd need a noise level field in the database
        filters.quietOperation = true
        break
    }
  }

  return filters
}

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json()
    
    if (!answers) {
      return NextResponse.json(
        { error: "Quiz answers are required" },
        { status: 400 }
      )
    }

    // Build database filters from quiz answers
    const filters = buildDatabaseFilters(answers)
    
    // Create Supabase client
    const supabase = createServerClient()
    
    // Start with base query for laser cutters only
    let query = supabase
      .from("machines")
      .select(`
        id,
        "Machine Name",
        "Company",
        "Laser Type A",
        "Laser Power A", 
        "Work Area",
        "Machine Size",
        "Price",
        "Price Category",
        "Image",
        "Camera",
        "Wifi",
        "Enclosure",
        "Passthrough",
        "Affiliate Link",
        "YouTube Review",
        "Excerpt (Short)",
        "Award",
        "Rating"
      `)
      .eq("Machine Category", "laser")
      .eq("Hidden", "false")

    // Apply laser type filters
    if (filters.laserTypes && filters.laserTypes.length > 0) {
      query = query.in("Laser Type A", filters.laserTypes)
    }

    // Apply price range filters if specified
    if (filters.priceRange) {
      query = query
        .gte("Price", filters.priceRange[0])
        .lte("Price", filters.priceRange[1])
        .not("Price", "is", null)
    }

    // Apply special capability filters
    if (filters.requiresCamera) {
      query = query.eq("Camera", "Yes")
    }

    if (filters.requiresPassthrough) {
      query = query.eq("Passthrough", "Yes") 
    }

    if (filters.requiresEnclosure) {
      query = query.eq("Enclosure", "Yes")
    }

    // Execute query
    const { data: machines, error } = await query
      .not("Price", "is", null) // Ensure we have prices
      .order("Price", { ascending: true })
      .limit(20) // Limit to top 20 matches

    if (error) {
      console.error("Database query error:", error)
      return NextResponse.json(
        { error: "Failed to fetch machines", details: error.message },
        { status: 500 }
      )
    }

    if (!machines || machines.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: "No machines found matching your criteria. Try adjusting your preferences."
      })
    }

    // Implement sophisticated scoring algorithm that prioritizes top picks
    const scoredMachines = machines.map((machine, index) => {
      let score = 100 - (index * 2) // Base score from price ordering
      
      // Major boost for editorial "Top Pick" machines
      if (machine.Award === "Top Pick") {
        score += 50 // Significant boost for top picks
      }
      
      // Additional scoring factors
      if (machine.Rating && machine.Rating >= 8) {
        score += 20 // High-rated machines
      }
      
      // Feature completeness bonus
      let featureScore = 0
      if (machine.Camera === "Yes") featureScore += 5
      if (machine.Wifi === "Yes") featureScore += 3  
      if (machine.Enclosure === "Yes") featureScore += 8
      if (machine.Passthrough === "Yes") featureScore += 5
      score += featureScore
      
      return {
        ...machine,
        score
      }
    })
    
    // Sort by score (highest first) instead of just price
    scoredMachines.sort((a, b) => b.score - a.score)

    // Group recommendations with explanations: Perfect Match, Alternative, Growth Path
    const recommendationTypes: ("perfect" | "alternative" | "growth")[] = ["perfect", "alternative", "growth"]
    
    const recommendations = [
      scoredMachines[0], // Perfect match
      scoredMachines[1] || scoredMachines[0], // Alternative (or same if only one)
      scoredMachines[2] || scoredMachines[1] || scoredMachines[0], // Growth path
    ]
      .filter(Boolean)
      .map((machine, index) => {
        const explanation = generateRecommendationExplanation(
          machine,
          answers,
          recommendationTypes[index]
        )
        
        return {
          ...machine,
          recommendationType: recommendationTypes[index],
          explanation
        }
      })

    return NextResponse.json({
      recommendations,
      totalMatches: machines.length,
      filters: filters,
      answers: answers // Include quiz answers for client-side reference
    })

  } catch (error) {
    console.error("API route error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}