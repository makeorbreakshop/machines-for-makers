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

interface Machine {
  "Machine Name": string
  "Company": string
  "Laser Type A": string
  "Laser Power A": string
  "Work Area": string
  "Machine Size": string
  Price: number
  Camera: string
  Wifi: string
  Enclosure: string
  Passthrough: string
  Award?: string
  Rating?: number
}

export function generateRecommendationExplanation(
  machine: Machine, 
  answers: QuizAnswers, 
  recommendationType: "perfect" | "alternative" | "growth"
): {
  whyThisMatches: string[]
  tradeOffs: string[]
  growthPath?: string
} {
  const explanations: string[] = []
  const tradeOffs: string[] = []
  let growthPath: string | undefined

  // Material-based explanations
  if (answers.materials) {
    const materialExplanations = {
      "wood-organic": `We recommended a ${machine["Laser Type A"]} laser because it excels at cutting and engraving wood, leather, paper, and other organic materials you plan to work with.`,
      "clear-acrylic": `The ${machine["Laser Type A"]} laser type is perfect for your clear acrylic and glass projects, providing clean cuts without melting or cracking.`,
      "dark-plastics": `This ${machine["Laser Type A"]} laser handles dark plastics and painted surfaces exceptionally well, giving you the versatility you need.`,
      "bare-metals": `Since you're working with bare metals, we selected a ${machine["Laser Type A"]} laser - the only type that can effectively mark and engrave steel, aluminum, and brass.`,
      "coated-metals": `For your coated metal projects, this ${machine["Laser Type A"]} laser will remove coatings and mark the underlying metal surface precisely.`,
      "electronics": `The ${machine["Laser Type A"]} laser provides the precision needed for electronics and PCB work, with minimal heat-affected zones.`,
      "mixed-materials": `This ${machine["Laser Type A"]} laser gives you versatility across multiple material types, though you may want to consider a dual-laser setup for maximum capability.`
    }
    if (materialExplanations[answers.materials as keyof typeof materialExplanations]) {
      explanations.push(materialExplanations[answers.materials as keyof typeof materialExplanations])
    }
  }

  // Project size explanations
  if (answers["project-sizes"]) {
    const workArea = machine["Work Area"] || "work area not specified"
    const sizeExplanations = {
      "small-items": `The ${workArea} work area is perfect for your jewelry, keychains, and phone case projects.`,
      "medium-projects": `With a ${workArea} work area, this machine handles your sign and laptop cover projects comfortably.`,
      "large-projects": `The generous ${workArea} work area accommodates your large sign and furniture panel projects.`,
      "variable-sizes": `The ${workArea} work area provides good flexibility for your variable project sizes.`,
      "long-materials": machine.Passthrough === "Yes" 
        ? `The pass-through capability lets you handle long materials that exceed the ${workArea} work area.`
        : `Note: This machine lacks pass-through capability, limiting you to materials that fit within the ${workArea} work area.`
    }
    if (sizeExplanations[answers["project-sizes"] as keyof typeof sizeExplanations]) {
      explanations.push(sizeExplanations[answers["project-sizes"] as keyof typeof sizeExplanations])
    }
  }

  // Usage frequency and reliability
  if (answers["usage-frequency"]) {
    const usageExplanations = {
      "occasional-hobby": `This machine is well-suited for your occasional weekend projects, offering good reliability without over-engineering for continuous use.`,
      "regular-hobby": `Perfect for your few-hours-per-week hobby schedule, providing consistent performance and reasonable maintenance requirements.`,
      "side-business": `This machine can handle your few-hours-daily side business operation, with durability built for regular commercial use.`,
      "full-time-business": `Built for your 40+ hour weekly business operation, this machine offers the reliability and speed needed for professional daily use.`,
      "high-volume": `This machine is designed for continuous high-volume production, with industrial-grade components for maximum uptime.`
    }
    if (usageExplanations[answers["usage-frequency"] as keyof typeof usageExplanations]) {
      explanations.push(usageExplanations[answers["usage-frequency"] as keyof typeof usageExplanations])
    }
  }

  // Workspace and safety considerations
  if (answers["safety-environment"] || answers.workspace) {
    if (answers["safety-environment"] === "must-be-enclosed" && machine.Enclosure === "Yes") {
      explanations.push("The fully enclosed design meets your safety requirements, containing fumes and laser radiation.")
    } else if (answers["safety-environment"] === "must-be-enclosed" && machine.Enclosure !== "Yes") {
      tradeOffs.push("⚠️ This open-frame design requires additional safety measures and ventilation in your workspace.")
    }

    if (answers["safety-environment"] === "quiet-operation" && machine.Enclosure === "Yes") {
      explanations.push("The enclosed design helps reduce noise levels for your quiet operation requirement.")
    }

    if (answers.workspace === "indoor-apartment" && machine.Enclosure !== "Yes") {
      tradeOffs.push("⚠️ This open design may not be suitable for indoor apartment use without significant ventilation modifications.")
    }
  }

  // Special capabilities
  if (answers["special-capabilities"]) {
    const capabilities = answers["special-capabilities"]
    
    if (capabilities.includes("camera-alignment") && machine.Camera === "Yes") {
      explanations.push("Includes the camera alignment system you requested for precision placement of your cuts and engravings.")
    } else if (capabilities.includes("camera-alignment") && machine.Camera !== "Yes") {
      tradeOffs.push("⚠️ Lacks the camera alignment feature you requested - you'll need to position materials manually.")
    }

    if (capabilities.includes("pass-through-capability") && machine.Passthrough === "Yes") {
      explanations.push("Features pass-through capability for the long materials you plan to work with.")
    } else if (capabilities.includes("pass-through-capability") && machine.Passthrough !== "Yes") {
      tradeOffs.push("⚠️ No pass-through capability - limits you to materials shorter than the work area.")
    }
  }

  // Technical comfort level
  if (answers["technical-comfort"]) {
    const comfortExplanations = {
      "plug-and-play": "This machine offers relatively straightforward setup, though some assembly will still be required.",
      "basic-setup": "The setup complexity matches your comfort level with basic assembly and configuration.",
      "diy-tinkering": "This machine offers good opportunities for customization and tinkering, matching your DIY approach.",
      "technical-expert": "The advanced features and customization options will appeal to your technical expertise."
    }
    if (comfortExplanations[answers["technical-comfort"] as keyof typeof comfortExplanations]) {
      explanations.push(comfortExplanations[answers["technical-comfort"] as keyof typeof comfortExplanations])
    }
  }

  // Budget context
  if (answers.budget) {
    const price = machine.Price
    const budgetExplanations = {
      "under-2k": price < 2000 
        ? "Fits within your under-$2,000 budget while delivering solid performance for getting started."
        : "⚠️ Exceeds your under-$2,000 budget - consider if the additional capability justifies the investment.",
      "2k-5k": (price >= 2000 && price <= 5000)
        ? "Well-positioned within your $2,000-$5,000 budget range, offering excellent value."
        : price < 2000 
          ? "Comes in under budget, leaving room for accessories and materials."
          : "⚠️ Above your $5,000 budget - evaluate if the premium features align with your needs.",
      "5k-15k": (price >= 5000 && price <= 15000)
        ? "Fits your $5,000-$15,000 professional budget, delivering commercial-grade capability."
        : price < 5000
          ? "Excellent value under your budget, with room for upgrades and accessories."
          : "⚠️ Exceeds your $15,000 budget - consider if the industrial features are necessary.",
      "budget-flexible": "Given your flexible budget approach, this machine offers excellent value for its capabilities."
    }
    
    const explanation = budgetExplanations[answers.budget as keyof typeof budgetExplanations]
    if (explanation) {
      if (explanation.startsWith("⚠️")) {
        tradeOffs.push(explanation)
      } else {
        explanations.push(explanation)
      }
    }
  }

  // Growth path recommendations
  if (recommendationType === "growth") {
    if (answers["usage-frequency"] === "regular-hobby") {
      growthPath = "Start with this machine for your current hobby needs, then upgrade to a more powerful commercial unit if you transition to business use."
    } else if (answers["usage-frequency"] === "side-business") {
      growthPath = "This machine can grow with your side business, handling increased volume as you expand operations."
    }
  }

  // Editorial top pick boost
  if (machine.Award === "Top Pick") {
    explanations.unshift("⭐ This is one of our editorial Top Picks - thoroughly tested and recommended by our experts.")
  }
  
  // High rating mention
  if (machine.Rating && machine.Rating >= 9) {
    explanations.push(`Rated ${machine.Rating}/10 by our review team for exceptional performance and reliability.`)
  }

  // Recommendation type specific messaging
  if (recommendationType === "alternative") {
    explanations.unshift("This alternative approach offers different trade-offs while still meeting your core requirements.")
  } else if (recommendationType === "perfect") {
    explanations.unshift("This machine matches your specific requirements most closely based on your quiz answers.")
  }

  return {
    whyThisMatches: explanations,
    tradeOffs,
    growthPath
  }
}