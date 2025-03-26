# Development Guidelines

## Technology Stack

### Core Technologies
- **Next.js**: v15.2.3 (Edge and App Router)
- **React**: v18.2.0
- **TypeScript**: v5.8.2
- **Tailwind CSS**: v3.4.17
- **Supabase**: Client v2.49.2
- **Radix UI**: v1.x (Various components)
- **Shadcn UI**: Built on Radix primitives
- **zod**: v3.22.4 (Form validation)
- **React Hook Form**: v7.49.3

## ⚠️ Critical: Next.js Runtime Configuration

Next.js 15 has different runtime requirements for different parts of the application:

1. **For API routes:**
   - MUST use: `export const runtime = 'edge';` or `export const runtime = 'nodejs';`
   - Edge API routes must declare `edge` runtime

This is intentional in Next.js architecture:
- Edge API routes have moved to the stable edge runtime
- This reflects the different maturity levels of these features in Next.js

For deployment troubleshooting:
- If API routes fail with "Invalid enum value. Expected 'edge' | 'nodejs'..." use 'edge'

## Server Management

### ⚠️ IMPORTANT: Server Restart Protocol
- **NEVER restart the development server** when making code changes
- When changes are made, always ask the user to restart the server themselves
- Always use port 3000, never allow automatic port switching

### Why This Matters
- Restarting the server disrupts the development workflow
- Creates port conflicts when multiple instances run simultaneously
- Prevents confusion between different server sessions

## Supabase Operations

### ⚠️ CRITICAL: Supabase Changes Protocol
- **STOP development work immediately** when Supabase changes are required
- This includes:
  - Creating or modifying tables
  - Setting up storage buckets
  - Configuring RLS policies
  - Creating or modifying Edge Functions
- Clearly explain what changes are needed in Supabase
- Wait for explicit user confirmation that changes have been completed
- Only continue development after confirmation

### Why This Matters
- Supabase changes require manual intervention in the Supabase dashboard
- Attempting to proceed without these changes will result in errors
- The assistant cannot directly make changes to Supabase infrastructure

## Code Modification Best Practices

1. Make changes to the codebase
2. Ask the user to test by refreshing their browser
3. If server restart is absolutely necessary, explicitly ASK the user to:
   - Stop current server process
   - Run `npm run dev` themselves

## Remember
- The user manages server processes, not the assistant
- Never automatically restart servers or suggest doing so
- Always prioritize maintaining a single server instance 
- Supabase infrastructure changes must be done by the user 

## Next.js Route Grouping and Admin Security

### ⚠️ CRITICAL: Admin Route Security Architecture

#### Route Structure Requirements
- The admin area MUST use ONLY the route group pattern: `/app/(admin)/admin/*`
- NEVER create routes at `/app/admin/*` alongside the route group
- Having duplicate routes (with and without parentheses) will bypass security mechanisms

#### Why This Matters
- Next.js route groups (with parentheses) maintain proper route organization
- Duplicate routes create conflicts that bypass authentication
- Security vulnerabilities occur when both `/app/admin/` and `/app/(admin)/admin/` exist simultaneously

#### Route Group Architecture Overview
```
app/
├── (admin)/           # Route group (parentheses = doesn't affect URL path)
│   └── admin/         # Actual admin routes (/admin in browser)
│       ├── login/     # Login page (/admin/login)
│       ├── page.tsx   # Dashboard page
│       └── layout.tsx # Admin layout with auth protection
```

#### Client-Side Authentication
- The application uses client-side authentication via the `AuthProvider` component
- This component wraps all admin pages and checks for the existence of auth cookies
- If no auth cookie exists, users are redirected to the login page
- The login page sets auth cookies upon successful authentication
- API routes for login/logout use the Edge runtime (`export const runtime = 'edge'`)

#### Security Checklist
- ✅ Admin routes MUST be in `/app/(admin)/admin/` only
- ✅ Login page MUST be in `/app/(admin)/admin/login/`
- ✅ NEVER create a duplicate route at `/app/admin/`
- ✅ Admin layout MUST use the `AuthProvider` component
- ✅ Manually test authentication by clearing cookies and verifying redirect to login

#### Testing Admin Security
1. Clear browser cookies completely
2. Try accessing `/admin` directly
3. Verify redirect to login page
4. After logging in, confirm access to admin
5. Verify logout functionality works correctly

### ⚠️ If Authentication Is Bypassed
If users can access admin without logging in:
1. **IMMEDIATELY** check for duplicate routes in `/app/admin/`
2. Delete any duplicate routes outside the route group
3. Verify the `AuthProvider` is properly wrapping all admin pages
4. Rebuild and deploy the application
5. Verify the fix by testing in incognito mode 

## Deployment Considerations
- The application uses Vercel for hosting
- API routes can use either `edge` or `nodejs` runtime
- Never use deprecated `experimental-edge` runtime
- Always test security features in production after deployment 