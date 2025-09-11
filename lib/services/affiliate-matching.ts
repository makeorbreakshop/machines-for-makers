export interface MachineMatch {
  machine_id: string;
  machine_name: string;
  confidence_score: number;
  match_reason: string;
}

export interface ProductMatchResult {
  raw_product_string: string;
  suggested_matches: MachineMatch[];
  exact_match?: MachineMatch;
}

export interface MachineMatchingService {
  findMatches(productString: string, availableMachines: any[]): ProductMatchResult;
  normalizeProductString(productString: string): string;
  calculateConfidence(productString: string, machineName: string): number;
}

export class AffiliateMatchingService implements MachineMatchingService {
  
  /**
   * Find potential machine matches for a product string
   */
  findMatches(productString: string, availableMachines: any[]): ProductMatchResult {
    if (!productString || !availableMachines.length) {
      return {
        raw_product_string: productString,
        suggested_matches: []
      };
    }

    const normalized = this.normalizeProductString(productString);
    const matches: MachineMatch[] = [];

    // Score each machine
    for (const machine of availableMachines) {
      const confidence = this.calculateConfidence(normalized, machine['Machine Name']);
      
      if (confidence > 0.3) { // Only include matches above 30% confidence
        matches.push({
          machine_id: machine.id,
          machine_name: machine['Machine Name'],
          confidence_score: confidence,
          match_reason: this.getMatchReason(normalized, machine['Machine Name'], confidence)
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence_score - a.confidence_score);

    const result: ProductMatchResult = {
      raw_product_string: productString,
      suggested_matches: matches
    };

    // Mark exact match if confidence is very high
    if (matches.length > 0 && matches[0].confidence_score > 0.8) {
      result.exact_match = matches[0];
    }

    return result;
  }

  /**
   * Normalize product string for comparison
   */
  normalizeProductString(productString: string): string {
    return productString
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Calculate confidence score between product string and machine name
   */
  calculateConfidence(normalizedProduct: string, machineName: string): number {
    const normalizedMachine = this.normalizeProductString(machineName);
    
    // Exact match
    if (normalizedProduct.includes(normalizedMachine)) {
      return 1.0;
    }

    // Special handling for xTool models
    if (machineName.toLowerCase().includes('xtool')) {
      return this.calculateXToolConfidence(normalizedProduct, machineName);
    }

    // Split into tokens for partial matching
    const productTokens = normalizedProduct.split(' ');
    const machineTokens = normalizedMachine.split(' ');

    let score = 0;
    let totalTokens = machineTokens.length;

    // Check how many machine tokens appear in product
    for (const machineToken of machineTokens) {
      if (machineToken === 'xtool') continue; // Skip brand name
      
      for (const productToken of productTokens) {
        if (productToken.includes(machineToken) || machineToken.includes(productToken)) {
          score += 1;
          break;
        }
      }
    }

    // Special scoring for model numbers (F1, F2, P2, P3, etc.)
    const modelMatches = this.findModelMatches(normalizedProduct, normalizedMachine);
    if (modelMatches > 0) {
      score += modelMatches * 0.5; // Model matches are important but not everything
    }

    return Math.min(score / totalTokens, 1.0);
  }

  /**
   * Find model number matches (F1, F2, P2S, etc.)
   */
  private findModelMatches(product: string, machine: string): number {
    const modelPattern = /([fpsm]\d+[a-z]*)/g;
    const productModels = product.match(modelPattern) || [];
    const machineModels = machine.match(modelPattern) || [];

    let matches = 0;
    for (const productModel of productModels) {
      if (machineModels.includes(productModel)) {
        matches++;
      }
    }

    return matches;
  }

  /**
   * Calculate confidence for xTool products with special handling
   */
  private calculateXToolConfidence(productString: string, machineName: string): number {
    const product = productString.toLowerCase();
    const machine = machineName.toLowerCase();

    // Extract the core model from machine name (e.g., "xTool P2S" -> "p2s")
    const machineModel = machine.replace('xtool', '').trim();

    // Handle P2 vs P2S distinction
    if (machineModel === 'p2s') {
      if (product.includes('p2s')) return 1.0;
      if (product.includes('p2 ') && !product.includes('p2s')) return 0.3; // Wrong model
      return 0;
    }
    
    if (machineModel === 'p2') {
      if (product.includes('p2s')) return 0.3; // Wrong model
      if (product.includes('p2 ') || (product.includes('p2/') && !product.includes('p2s'))) return 1.0;
      return 0;
    }

    // Handle F1 variants - CHECK MORE SPECIFIC VARIANTS FIRST
    if (machineModel === 'f1 ultra') {
      if (product.includes('f1 ultra')) return 1.0;
      if (product.includes('f1') && !product.includes('ultra') && !product.includes('lite')) return 0.3;
      return 0;
    }
    
    if (machineModel === 'f1 lite') {
      if (product.includes('f1 lite')) return 1.0;
      if (product.includes('f1/f1 lite')) return 0.75; // Ambiguous but likely
      if (product.includes('f1') && !product.includes('ultra') && !product.includes('lite')) return 0.3;
      return 0;
    }
    
    if (machineModel === 'f1') {
      if (product.includes('f1 ultra')) return 0.3; // Wrong variant - should match F1 Ultra instead
      if (product.includes('f1 lite')) return 0.3; // Wrong variant - should match F1 Lite instead
      if (product.includes('f1/f1 lite')) return 0.75; // Ambiguous but likely the base model
      if (product.includes('f1 ') || product.includes('f1/')) {
        // Make sure it's not F1 Ultra or F1 Lite
        if (!product.includes('ultra') && !product.includes('lite')) {
          return 1.0;
        }
        return 0.3;
      }
      return 0;
    }

    // Handle F2 Ultra
    if (machineModel === 'f2 ultra') {
      if (product.includes('f2 ultra')) return 1.0;
      return 0;
    }

    // Handle M1 Ultra
    if (machineModel === 'm1 ultra') {
      if (product.includes('m1 ultra')) return 1.0;
      if (product.includes('m1 ') && !product.includes('ultra')) return 0.3;
      return 0;
    }

    // Handle S1
    if (machineModel === 's1') {
      if (product.includes('s1 ')) return 1.0;
      return 0;
    }

    // Handle P3
    if (machineModel === 'p3') {
      if (product.includes('p3 ')) return 1.0;
      return 0;
    }

    // Default fallback to general matching
    if (product.includes(machineModel)) {
      return 0.75;
    }

    return 0;
  }

  /**
   * Get human-readable reason for the match
   */
  private getMatchReason(product: string, machine: string, confidence: number): string {
    const prod = product.toLowerCase();
    const mach = machine.toLowerCase();
    
    if (confidence === 1.0) {
      // Check for specific model matches
      if (mach.includes('p2s') && prod.includes('p2s')) {
        return 'Exact P2S model match';
      }
      if (mach.includes('p2') && !mach.includes('p2s') && prod.includes('p2 ')) {
        return 'Exact P2 model match';
      }
      if (mach.includes('f1 ultra') && prod.includes('f1 ultra')) {
        return 'Exact F1 Ultra model match';
      }
      if (mach.includes('f1 lite') && prod.includes('f1 lite')) {
        return 'Exact F1 Lite model match';
      }
      if (mach.includes('f2 ultra') && prod.includes('f2 ultra')) {
        return 'Exact F2 Ultra model match';
      }
      return 'Exact match found';
    } else if (confidence > 0.7) {
      if (prod.includes('f1/f1 lite')) {
        return 'Ambiguous F1 variant - manual review recommended';
      }
      return 'Strong model number match';
    } else if (confidence > 0.5) {
      return 'Partial model match';
    } else if (confidence > 0.3) {
      return 'Possible match based on keywords';
    } else {
      return 'Weak match - manual review needed';
    }
  }

  /**
   * Get xTool-specific matching patterns
   */
  static getXToolPatterns(): Record<string, string[]> {
    return {
      'F1': ['f1', 'f1 ultra', 'f1 lite'],
      'F2': ['f2', 'f2 ultra'],
      'P2': ['p2', 'p2s'],
      'P3': ['p3', 'p3 flagship', 'p3 80w'],
      'S1': ['s1'],
      'M1': ['m1', 'm1 ultra']
    };
  }

  /**
   * Process a batch of products for matching
   */
  async processBatch(
    products: string[], 
    availableMachines: any[],
    existingMatches?: Map<string, string>
  ): Promise<Map<string, ProductMatchResult>> {
    const results = new Map<string, ProductMatchResult>();

    for (const product of products) {
      // Check existing matches first
      if (existingMatches?.has(product)) {
        const machineId = existingMatches.get(product)!;
        const machine = availableMachines.find(m => m.id === machineId);
        
        if (machine) {
          results.set(product, {
            raw_product_string: product,
            suggested_matches: [{
              machine_id: machine.id,
              machine_name: machine['Machine Name'],
              confidence_score: 1.0,
              match_reason: 'Previously confirmed match'
            }],
            exact_match: {
              machine_id: machine.id,
              machine_name: machine['Machine Name'],
              confidence_score: 1.0,
              match_reason: 'Previously confirmed match'
            }
          });
          continue;
        }
      }

      // Find new matches
      const result = this.findMatches(product, availableMachines);
      results.set(product, result);
    }

    return results;
  }
}