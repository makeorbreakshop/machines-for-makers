# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Machines for Makers is a Next.js 15 application for comparing laser cutters, 3D printers, and CNC machines. It features a public website and an admin panel for content management.

## Essential Commands

### Development
```bash
npm run dev              # Start development server (port 3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run dev:mcp          # Run dev server with MCP tools
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
python main.py  # Run the FastAPI server
```

## Critical Development Rules

### 1. Server Management
- **NEVER restart the development server** - always ask the user
- Always use port 3000, don't allow automatic port switching
- The user manages all server processes

### 2. Supabase Database
- **STOP immediately** when Supabase infrastructure changes are needed (tables, RLS policies, storage)
- Cannot make changes to Supabase directly - must ask user
- When referencing database operations, use MCP access to verify structure
- Always use `createServerClient()` from `@/lib/supabase/server` for server components

### 3. Next.js Runtime Configuration
- API Routes: Use `export const runtime = 'edge';` or `export const runtime = 'nodejs';`
- Server Components with Supabase: MUST use `export const runtime = 'nodejs';`
- Never use deprecated `experimental-edge` runtime

### 4. Admin Security
- Admin routes MUST be in `/app/(admin)/admin/` ONLY
- NEVER create duplicate routes at `/app/admin/`
- Uses client-side authentication via `AuthProvider` component

### 5. Terminal Commands
- Always wait for commands to fully complete before suggesting new ones
- Never suggest running the same test multiple times in parallel
- Ask permission before rerunning any test command

## Architecture Overview

### Route Structure
```
/app
  /(site)               # Public website routes
    /                   # Homepage
    /products           # Product listings
    /compare            # Comparison tool
    /brand/*            # Brand pages
    /tools/*            # Ink calculator, machine finder
  /(admin)              # Admin panel (protected)
    /admin/*            # All admin routes
  /api                  # API endpoints
    /admin/*            # Admin API routes
    /auth/*             # Authentication endpoints
```

### Key Services & Components

**Frontend Components:**
- `/components/ui/*` - Shadcn UI components (Radix primitives)
- `/components/admin/*` - Admin-specific components
- `/components/product-v2/*` - Enhanced product display components

**Core Services (`/lib/services/`):**
- `brands.ts` - Brand data operations
- `categories.ts` - Category management
- `machines.ts` - Machine data fetching and filtering
- `reviews.ts` - Review management
- `affiliate-links.ts` - Affiliate link handling

**Database Types (`/types/`):**
- `database.types.ts` - Supabase-generated types
- `filters.types.ts` - Filter system types
- `ink-calculator.types.ts` - Ink calculator types

### Technology Decisions

1. **Data Fetching**: Prefer direct Supabase access in server components over creating API routes
2. **UI Components**: Use Shadcn UI components - they're already configured with Radix UI
3. **Forms**: Use React Hook Form with Zod validation
4. **Search**: Fuse.js is available for fuzzy search functionality
5. **Styling**: Tailwind CSS with custom theme configuration

### Common Patterns

**Server Component Data Fetching:**
```typescript
export const runtime = 'nodejs';  // Required for Supabase

import { createServerClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('machines')
    .select('*');
  // ...
}
```

**Protected Admin Routes:**
```typescript
// Always in /app/(admin)/admin/* path
import { AuthProvider } from '@/components/admin/auth-provider';

export default function AdminLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

**API Route Pattern:**
```typescript
export const runtime = 'edge';  // or 'nodejs' for Supabase

export async function GET(request: Request) {
  // Implementation
}
```

### Testing Approach

The project uses standard npm scripts. To run tests or linting:
- Check package.json for available test commands
- Currently uses ESLint for code quality (`npm run lint`)

### Important Notes

- The application is deployed on Vercel
- MCP (Model Context Protocol) integration is available for browser automation
- Python price extractor service runs as a separate FastAPI application
- Always check PRD documents in `/docs` for feature requirements
- Respect existing code conventions and patterns when making changes