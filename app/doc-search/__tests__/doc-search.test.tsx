import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocSearchPage from '../page';
import lightburnChunks from '@/doc-search-tool/data/lightburn-chunks.json';

// Mock the Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // Remove Next.js specific props that don't apply to regular img
    const { priority, fill, sizes, ...imgProps } = props;
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...imgProps} />;
  },
}));

// Mock the fetch for logo
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ url: '/test-logo.png' }),
  })
) as jest.Mock;

// Mock window.open for external links
global.window.open = jest.fn();

describe('DocSearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should display the search interface with logo and search bar', async () => {
      render(<DocSearchPage />);
      
      // Check for main elements
      expect(screen.getByText('Documentation Search')).toBeInTheDocument();
      expect(screen.getByText('Search documentation from LightBurn, XTool, Glowforge, and 20+ manufacturers')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ask anything/i)).toBeInTheDocument();
      
      // Check for search button
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
      
      // Check for suggested queries
      expect(screen.getByText('Popular:')).toBeInTheDocument();
    });

    it('should fetch and display the logo', async () => {
      render(<DocSearchPage />);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/logo');
      });
    });
  });

  describe('Search Functionality', () => {
    it('should search for "birch" and return relevant results', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      // Type search query
      fireEvent.change(searchInput, { target: { value: 'birch' } });
      fireEvent.click(searchButton);
      
      // Wait for results
      await waitFor(() => {
        // Check that we found results
        expect(screen.getByText(/I found [1-9] relevant documentation sections/)).toBeInTheDocument();
      });
      
      // Check that birch-related content appears in snippets
      const snippets = screen.getAllByText(/birch/i);
      expect(snippets.length).toBeGreaterThan(0);
      
      // Check for specific birch content in the results
      expect(screen.getByText(/15mm\/s at 80% power/)).toBeInTheDocument();
    });

    it('should search for "acrylic" and return acrylic-specific results', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'acrylic' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/I found [1-9] relevant documentation sections/)).toBeInTheDocument();
      });
      
      // Check for acrylic-specific content in results
      const acrylicContent = screen.getAllByText(/acrylic/i);
      expect(acrylicContent.length).toBeGreaterThan(0);
      
      // Check for specific acrylic settings
      expect(screen.getByText(/20mm\/s at 60% power/)).toBeInTheDocument();
    });

    it('should handle searches with no results gracefully', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'xyz123nonsense' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/I found 0 relevant documentation sections/)).toBeInTheDocument();
      });
    });

    it('should handle multi-word searches correctly', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'camera calibration' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/I found [1-9] relevant documentation sections/)).toBeInTheDocument();
      });
      
      // Check that camera-related content appears
      const cameraContent = screen.getAllByText(/camera/i);
      expect(cameraContent.length).toBeGreaterThan(0);
    });
  });

  describe('Result Display', () => {
    it('should display correct metadata for search results', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'focus' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/I found [1-9] relevant documentation sections/)).toBeInTheDocument();
      });
      
      // Check for page number display (Page 23 for focus)
      expect(screen.getByText(/Page \d+/)).toBeInTheDocument();
      
      // Check for manufacturer badge
      const badges = screen.getAllByText('LightBurn');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should show relevance scores for results', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'laser' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/% match/)).toBeInTheDocument();
      });
    });
  });

  describe('External Link Functionality', () => {
    it('should open external documentation when View Source is clicked', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'rotary' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Rotary Setup/)).toBeInTheDocument();
      });
      
      // Click View Source button
      const viewSourceButton = screen.getAllByText('View Source')[0];
      fireEvent.click(viewSourceButton);
      
      // Check that window.open was called with correct URL
      expect(window.open).toHaveBeenCalledWith(
        'https://lightburnsoftware.github.io/NewDocs/',
        '_blank'
      );
    });

    it('should add a system message when opening external docs', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'leather' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Material Settings - Leather/)).toBeInTheDocument();
      });
      
      const viewSourceButton = screen.getAllByText('View Source')[0];
      fireEvent.click(viewSourceButton);
      
      // Check for system message
      await waitFor(() => {
        expect(screen.getByText(/Opening LightBurn documentation/)).toBeInTheDocument();
      });
    });
  });

  describe('Chat Interface', () => {
    it('should transform to chat interface after first search', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        // Check for chat input instead of search bar
        expect(screen.getByPlaceholderText(/Ask a follow-up question/i)).toBeInTheDocument();
      });
      
      // Check for New Search button
      expect(screen.getByRole('button', { name: /New Search/i })).toBeInTheDocument();
    });

    it('should allow follow-up questions in chat', async () => {
      render(<DocSearchPage />);
      
      // Initial search
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      fireEvent.change(searchInput, { target: { value: 'cutting' } });
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a follow-up question/i)).toBeInTheDocument();
      });
      
      // Follow-up question
      const followUpInput = screen.getByPlaceholderText(/Ask a follow-up question/i);
      fireEvent.change(followUpInput, { target: { value: 'what about power settings?' } });
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText('what about power settings?')).toBeInTheDocument();
      });
    });
  });

  describe('Response Modes', () => {
    it('should toggle between Docs and AI modes', async () => {
      render(<DocSearchPage />);
      
      // Check initial state
      expect(screen.getByRole('tab', { name: /Docs/i })).toHaveAttribute('data-state', 'active');
      
      // Switch to AI mode
      fireEvent.click(screen.getByRole('tab', { name: /AI/i }));
      
      // Verify AI mode is active
      expect(screen.getByRole('tab', { name: /AI/i })).toHaveAttribute('data-state', 'active');
    });

    it('should provide different responses in AI mode', async () => {
      render(<DocSearchPage />);
      
      // Switch to AI mode
      fireEvent.click(screen.getByRole('tab', { name: /AI/i }));
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'cutting wood' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        // AI mode provides more conversational response
        expect(screen.getByText(/Based on the LightBurn documentation/)).toBeInTheDocument();
      });
    });
  });

  describe('Keyword Scoring Algorithm', () => {
    it('should rank results by relevance score', async () => {
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      // Search for a term that appears in multiple chunks
      fireEvent.change(searchInput, { target: { value: 'power' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        const results = screen.getAllByText(/% match/);
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThanOrEqual(5); // Max 5 results
      });
    });

    it('should prioritize title and section matches over content matches', async () => {
      // This tests that our scoring algorithm gives higher weight to title/section matches
      render(<DocSearchPage />);
      
      const searchInput = screen.getByPlaceholderText(/Ask anything/i);
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      fireEvent.change(searchInput, { target: { value: 'troubleshooting' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText(/I found [1-9] relevant documentation sections/)).toBeInTheDocument();
      });
      
      // The first result should be the Troubleshooting Guide since it has the word in the title
      const resultTitles = screen.getAllByRole('heading', { level: 3 });
      expect(resultTitles[0].textContent).toContain('Troubleshooting');
    });
  });

  describe('Quick Suggestions', () => {
    it('should populate search from suggested queries', async () => {
      render(<DocSearchPage />);
      
      // Find a suggested query button
      const suggestions = screen.getAllByRole('button');
      const suggestionButton = suggestions.find(btn => 
        btn.textContent && btn.textContent !== 'Search' && btn.textContent !== 'Popular:'
      );
      
      if (suggestionButton) {
        fireEvent.click(suggestionButton);
        
        await waitFor(() => {
          // Should trigger a search
          expect(screen.getByText(/I found/)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty search gracefully', async () => {
      render(<DocSearchPage />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      // Click search without entering anything
      fireEvent.click(searchButton);
      
      // Should not trigger search
      await waitFor(() => {
        expect(screen.queryByText(/I found/)).not.toBeInTheDocument();
      });
    });

    it('should handle API failures gracefully', async () => {
      // Mock fetch to fail
      global.fetch = jest.fn(() => Promise.reject(new Error('API Error'))) as jest.Mock;
      
      render(<DocSearchPage />);
      
      // Logo should have fallback
      await waitFor(() => {
        const fallbackElement = document.querySelector('.animate-pulse');
        expect(fallbackElement).toBeInTheDocument();
      });
    });
  });
});