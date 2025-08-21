import lightburnChunks from '@/doc-search-tool/data/lightburn-chunks.json';

// Extract the search algorithm from the component for testing
export function searchChunks(query: string, chunks: typeof lightburnChunks.chunks) {
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
  
  if (searchTerms.length === 0) return [];
  
  const scoredChunks = chunks.map(chunk => {
    const text = chunk.text.toLowerCase();
    const title = chunk.title.toLowerCase();
    const section = chunk.section.toLowerCase();
    
    let score = 0;
    searchTerms.forEach(term => {
      // Text matches get 2 points
      if (text.includes(term)) score += 2;
      // Title matches get 3 points (higher priority)
      if (title.includes(term)) score += 3;
      // Section matches get 2 points
      if (section.includes(term)) score += 2;
    });
    
    return { chunk, score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);
  
  return scoredChunks;
}

describe('Search Algorithm', () => {
  describe('Basic Search', () => {
    it('should find chunks containing search term', () => {
      const results = searchChunks('birch', lightburnChunks.chunks);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].chunk.text.toLowerCase()).toContain('birch');
    });

    it('should return empty array for no matches', () => {
      const results = searchChunks('xyz123nonsense', lightburnChunks.chunks);
      
      expect(results).toEqual([]);
    });

    it('should handle empty search query', () => {
      const results = searchChunks('', lightburnChunks.chunks);
      
      expect(results).toEqual([]);
    });

    it('should handle whitespace-only query', () => {
      const results = searchChunks('   ', lightburnChunks.chunks);
      
      expect(results).toEqual([]);
    });
  });

  describe('Multi-word Search', () => {
    it('should find chunks matching multiple terms', () => {
      const results = searchChunks('laser cutting', lightburnChunks.chunks);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Chunks with both terms should score higher
      const topResult = results[0];
      expect(
        topResult.chunk.text.toLowerCase().includes('laser') ||
        topResult.chunk.text.toLowerCase().includes('cutting')
      ).toBe(true);
    });

    it('should accumulate scores for multiple term matches', () => {
      const results = searchChunks('power speed', lightburnChunks.chunks);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Chunks mentioning both power and speed should rank higher
      const topResult = results[0];
      expect(topResult.score).toBeGreaterThanOrEqual(4); // At least 2 points per term
    });
  });

  describe('Scoring Priority', () => {
    it('should prioritize title matches over content matches', () => {
      const results = searchChunks('troubleshooting', lightburnChunks.chunks);
      
      if (results.length > 0) {
        const topResult = results[0];
        // Title "Troubleshooting Guide" should rank first
        expect(topResult.chunk.title.toLowerCase()).toContain('troubleshooting');
      }
    });

    it('should prioritize section matches appropriately', () => {
      const results = searchChunks('calibration', lightburnChunks.chunks);
      
      if (results.length > 0) {
        const hasCalibrationInSection = results.some(r => 
          r.chunk.section.toLowerCase().includes('calibration')
        );
        expect(hasCalibrationInSection).toBe(true);
      }
    });

    it('should calculate correct scores for combined matches', () => {
      // Create a test chunk that we know the content of
      const testChunks = [
        {
          id: 'test-1',
          text: 'This is about laser cutting',
          title: 'Laser Guide',
          section: 'Cutting Section',
          source_url: 'http://test.com',
          page: 1,
          manufacturer: 'Test'
        },
        {
          id: 'test-2',
          text: 'General information',
          title: 'General Guide',
          section: 'Laser Section',
          source_url: 'http://test.com',
          page: 2,
          manufacturer: 'Test'
        }
      ];
      
      const results = searchChunks('laser', testChunks);
      
      // First chunk should score: 2 (text) + 3 (title) = 5
      // Second chunk should score: 2 (section) = 2
      expect(results[0].score).toBe(5);
      expect(results[1].score).toBe(2);
    });
  });

  describe('Result Limiting', () => {
    it('should return maximum 5 results', () => {
      // Search for common term that appears in many chunks
      const results = searchChunks('the', lightburnChunks.chunks);
      
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return results sorted by score descending', () => {
      const results = searchChunks('laser power', lightburnChunks.chunks);
      
      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
        }
      }
    });
  });

  describe('Case Sensitivity', () => {
    it('should be case insensitive for searches', () => {
      const resultsLower = searchChunks('birch', lightburnChunks.chunks);
      const resultsUpper = searchChunks('BIRCH', lightburnChunks.chunks);
      const resultsMixed = searchChunks('BiRcH', lightburnChunks.chunks);
      
      expect(resultsLower.length).toBe(resultsUpper.length);
      expect(resultsLower.length).toBe(resultsMixed.length);
      
      // Should return same chunks
      if (resultsLower.length > 0) {
        expect(resultsLower[0].chunk.id).toBe(resultsUpper[0].chunk.id);
        expect(resultsLower[0].chunk.id).toBe(resultsMixed[0].chunk.id);
      }
    });
  });

  describe('Special Search Terms', () => {
    it('should find specific settings like "15mm/s"', () => {
      const results = searchChunks('15mm/s', lightburnChunks.chunks);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].chunk.text).toContain('15mm/s');
    });

    it('should find percentage values like "80%"', () => {
      const results = searchChunks('80%', lightburnChunks.chunks);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].chunk.text).toContain('80%');
    });

    it('should find technical terms with numbers', () => {
      const results = searchChunks('3mm', lightburnChunks.chunks);
      
      expect(results.length).toBeGreaterThan(0);
      // Should find references to 3mm materials
    });
  });

  describe('Chunk Content Verification', () => {
    it('should have all required fields in chunks', () => {
      lightburnChunks.chunks.forEach(chunk => {
        expect(chunk).toHaveProperty('id');
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('title');
        expect(chunk).toHaveProperty('section');
        expect(chunk).toHaveProperty('source_url');
        expect(chunk).toHaveProperty('page');
        expect(chunk).toHaveProperty('manufacturer');
        
        // Verify types
        expect(typeof chunk.id).toBe('string');
        expect(typeof chunk.text).toBe('string');
        expect(typeof chunk.title).toBe('string');
        expect(typeof chunk.section).toBe('string');
        expect(typeof chunk.source_url).toBe('string');
        expect(typeof chunk.page).toBe('number');
        expect(typeof chunk.manufacturer).toBe('string');
      });
    });

    it('should have meaningful content in chunks', () => {
      lightburnChunks.chunks.forEach(chunk => {
        expect(chunk.text.length).toBeGreaterThan(50); // Meaningful content
        expect(chunk.title.length).toBeGreaterThan(0);
        expect(chunk.section.length).toBeGreaterThan(0);
      });
    });
  });
});