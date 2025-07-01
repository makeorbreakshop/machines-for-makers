# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Machines for Makers is a Next.js 15 application for comparing laser cutters, 3D printers, and CNC machines. It features a public website with advanced filtering, comparison tools, an ink cost calculator, and a comprehensive admin panel for content management.

## Essential Commands

### Development
```bash
npm run dev              # Start development server (port 3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run dev:mcp          # Run dev server with MCP tools
npm run mcp              # Run MCP browser tools separately
```

### Database Operations
```bash
npm run supabase:migrations        # Apply database migrations
npm run supabase:create-settings   # Create site settings
```

### Python Price Extractor Service
```bash
cd price-extractor-python
pip install -r requirements.txt
python main.py  # Run the FastAPI server on port 8000
```

**Important**: The price extractor service should be run in a separate terminal from the main Next.js application. Both services run simultaneously and communicate via HTTP.

## Critical Development Rules

### 1. Server Management
- **NEVER restart the development server** - always ask the user
- Always use port 3000, don't allow automatic port switching
- The user manages all server processes
- When code changes are made, ask user to refresh browser instead

### 2. Supabase Database
- **STOP immediately** when Supabase infrastructure changes are needed (tables, RLS policies, storage)
- Cannot make changes to Supabase directly - must ask user to make changes in Supabase dashboard
- When referencing database operations, use MCP access to verify structure
- Always use `createServerClient()` from `@/lib/supabase/server` for server components
- Use `createServiceClient()` for admin operations requiring service role key

### 3. Next.js Runtime Configuration
- **Server Components with Supabase**: MUST use `export const runtime = 'nodejs';`
- **API Routes**: Use `export const runtime = 'edge';` for performance, `'nodejs'` when Supabase access needed
- **Never use**: deprecated `experimental-edge` runtime
- **Critical**: Runtime mismatch causes deployment failures

### 4. Admin Security Architecture
- Admin routes MUST be in `/app/(admin)/admin/` ONLY (route groups)
- **NEVER create duplicate routes** at `/app/admin/` - this bypasses security
- Uses client-side authentication via `AuthProvider` component
- Authentication system uses cookies, login/logout via API routes
- Test admin security by clearing cookies and verifying redirect to login

### 5. Terminal Commands
- Always wait for commands to fully complete before suggesting new ones
- Never suggest running the same test multiple times in parallel
- Ask permission before rerunning any test command

## Architecture Overview

### Route Structure
```
/app
  /(site)               # Public website routes
    /                   # Homepage with featured machines
    /products           # Product listings with filters
    /compare            # Side-by-side comparison tool
    /category/[slug]    # Category pages (laser-cutters, etc.)
    /products/[slug]    # Individual machine pages
    /tools/*            # Ink calculator, machine finder
    /guides/*           # Educational guides
  /(admin)              # Admin panel (protected route group)
    /admin/*            # All admin routes (dashboard, machines, etc.)
  /api                  # API endpoints
    /admin/*            # Admin API routes
    /ink-cost           # Ink calculator API
    /cron/*             # Scheduled operations
```

### Core Architecture Patterns

**Data Flow:**
1. **Server Components**: Direct Supabase access for initial page loads
2. **Client Components**: Supabase client for user interactions
3. **API Routes**: Admin operations and external integrations
4. **MCP Integration**: Browser automation and Supabase operations

**Database Architecture:**
- PostgreSQL via Supabase with 24+ tables
- Key tables: `machines`, `brands`, `categories`, `reviews`, `ink_calculator_calibration`
- Complex relationships for machine specifications and filtering
- Auto-calibration system for ink cost calculations

### Key Features & Services

**Public Features:**
- Advanced filtering system with 10+ filter types
- Interactive comparison table (up to 4 machines)
- Fuzzy search with Fuse.js
- Ink cost calculator with image analysis
- Machine finder tool
- Promo code integration

**Admin Features:**
- Complete CRUD for machines, brands, categories
- Review moderation system
- Ink calculator calibration and validation
- Price tracking and batch operations
- Machine scraping tools

**Core Services (`/lib/services/`):**
- `machine-service.ts` - Complex filtering and data operations
- `brand-service.ts` - Brand management
- `category-service.ts` - Category operations
- `review-service.ts` - Review system
- `claude-service.ts` - AI integration for content

### Technology Stack Specifics

**UI Framework:** 
- Shadcn UI (Radix primitives) - pre-configured, prefer over custom components
- Tailwind CSS with custom theme
- Framer Motion for animations
- React Hook Form + Zod for forms

**Data Management:**
- Supabase (PostgreSQL) with TypeScript types
- @tanstack/react-query for client-side caching
- Direct server component access preferred over API routes

**Specialized Tools:**
- Puppeteer for web scraping
- Sharp for image processing
- Recharts for data visualization
- Fuse.js for search functionality

### Common Implementation Patterns

**Server Component with Data Fetching:**
```typescript
export const runtime = 'nodejs';  // Required for Supabase

import { createServerClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('machines')
    .select(`
      *,
      brands(name, slug),
      categories(name)
    `);
  
  if (error) {
    throw new Error('Failed to fetch data');
  }
  
  return <div>{/* Component JSX */}</div>;
}
```

**Protected Admin Layout:**
```typescript
// Always in /app/(admin)/admin/* path structure
import { AuthProvider } from '@/components/admin/auth-provider';

export default function AdminLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <AuthProvider>
      <div className="admin-layout">
        {children}
      </div>
    </AuthProvider>
  );
}
```

**API Route with Proper Runtime:**
```typescript
export const runtime = 'edge';  // or 'nodejs' if Supabase needed

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // API implementation
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Specialized Components

**Ink Calculator System (`/app/tools/ink-calculator/`):**
- Complex image analysis for ink coverage estimation
- Auto-calibration system using real test data
- Multiple ink modes (CMYK, CMYK+White, etc.)
- Admin validation dashboard for accuracy improvement

**Comparison System:**
- Persistent comparison state via React Context
- Mobile-responsive comparison table
- Highlight differences between machines
- Export comparison results

**Filter System:**
- Unified filter component handling 10+ filter types
- Real-time filtering with debounced search
- URL state management for shareable filtered views
- Mobile filter drawer with organized sections

### Database Schema Considerations

When working with database operations:
- Use MCP Supabase tools to verify table structure before queries
- Complex joins are common (machines + brands + categories)
- RLS policies control data access
- Specialized tables for ink calculator calibration data

### Development Workflow

1. **Code Changes**: Make modifications to files
2. **Testing**: Ask user to refresh browser to test changes
3. **Database Changes**: Stop and ask user to make Supabase changes
4. **Server Issues**: Ask user to restart server if absolutely necessary
5. **Linting**: Run `npm run lint` after significant changes

### Dual-Service Architecture

The application consists of two services that run independently:

**Service 1 - Next.js Application (Port 3000):**
- Main website and admin interface
- Handles user interactions, data display, authentication
- Run with: `npm run dev`

**Service 2 - Python Price Extractor (Port 8000):**
- FastAPI service for web scraping and price extraction
- Processes price updates and maintains price history
- Run with: `cd price-extractor-python && python main.py`

**Service Communication:**
- Next.js admin panel makes HTTP requests to Python API
- Both services share the same Supabase database
- JavaScript integration via `price-tracker-api.js`

### Deployment Architecture

- **Platform**: Vercel with optimized caching
- **Performance**: Server-side rendering with strategic client hydration
- **Security**: Route groups for admin protection, environment-based configurations
- **Monitoring**: Vercel Analytics and Speed Insights integrated

### Important Files

- `/docs/DATABASE_SCHEMA.md` - Complete database documentation
- `/docs/DEVELOPMENT_GUIDELINES.md` - Detailed development protocols
- `/app/tools/ink-calculator/README.md` - Ink calculator technical details
- `/lib/supabase/server.ts` - Server client configurations
- `/components/ui/` - Pre-built Shadcn components (use these first)

### Testing and Quality

- ESLint for code quality (`npm run lint`)
- TypeScript strict mode enabled
- No formal test suite currently - verify functionality through browser testing
- Performance monitoring via Vercel Speed Insights