# Development Guidelines

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