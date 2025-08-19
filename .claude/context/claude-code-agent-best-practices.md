# Claude Code Agent Best Practices Guide

A comprehensive guide for creating and configuring Claude Code agents based on official documentation and community examples.

## Table of Contents
1. [Memory Management & CLAUDE.md Files](#memory-management--claudemd-files)
2. [Project Setup & Configuration](#project-setup--configuration)
3. [Subagent Architecture](#subagent-architecture)
4. [CLAUDE.md Structure Best Practices](#claudemd-structure-best-practices)
5. [Real-World Examples](#real-world-examples)
6. [Performance Optimization](#performance-optimization)
7. [Common Patterns & Anti-Patterns](#common-patterns--anti-patterns)

## Memory Management & CLAUDE.md Files

### Memory Hierarchy
Claude Code uses a four-tier memory system, loaded in order of precedence:
1. **Enterprise Policy** - System-wide configurations
2. **Project Memory** - Team-shared project settings
3. **User Memory** - Personal preferences across projects
4. **Local Project Memory** - Project-specific instructions (deprecated)

### CLAUDE.md Import System
- Use `@path/to/import` syntax to include additional memory files
- Supports both relative and absolute paths
- Maximum import depth: 5 hops
- Higher-level memories take precedence

### Quick Memory Addition
- Start input with `#` for prompted memory storage
- Use `/memory` slash command for direct editing
- Review and update memories periodically

## Project Setup & Configuration

### Initial Setup Checklist
```bash
# Installation Options
npm install -g @anthropic-ai/claude-code        # Node.js 18+
curl -fsSL claude.ai/install.sh | bash          # macOS/Linux
irm https://claude.ai/install.ps1 | iex         # Windows

# First Session
cd /path/to/project
claude                                           # Start interactive mode
```

### Project Discovery Best Practices
1. Let Claude explore your codebase first: `"what does this project do?"`
2. Provide context about architecture and conventions
3. Document critical business rules and constraints
4. Specify preferred tools and libraries

## Subagent Architecture

### Standard Subagent Template
```yaml
---
name: specialized-agent
description: Brief capability description
tools: [Read, Write, Edit, Bash, WebSearch]
---

# Role & Expertise
Define the agent's specialized domain and responsibilities

## Core Competencies
- Specific technology expertise
- Problem-solving approaches
- Quality standards

## MCP Tool Integration
Document which tools are essential and usage patterns

## Communication Protocol
Define how this agent interacts with others

## Implementation Workflow
1. Planning Phase (time estimate)
2. Development Phase (time estimate)
3. Validation Phase (time estimate)

## Output Artifacts
- Expected deliverables
- Documentation requirements
- Quality metrics
```

### Storage Locations
- **Project-specific**: `.claude/agents/` (higher precedence)
- **Global**: `~/.claude/agents/` (available across projects)

### Agent Types & Use Cases
- **Code Review Agents**: Automated quality checks
- **Architecture Agents**: System design and planning
- **Testing Agents**: Test generation and validation
- **Documentation Agents**: API docs and guides
- **DevOps Agents**: CI/CD and deployment

## CLAUDE.md Structure Best Practices

### Essential Sections

#### 1. Project Overview
```markdown
## Project Overview
Brief description of the application, its purpose, and target users
Tech stack summary and architecture type
```

#### 2. Critical Rules
```markdown
## Critical Development Rules
### NEVER DO
- List destructive operations to avoid
- Security vulnerabilities to prevent
- Anti-patterns specific to your project

### ALWAYS DO
- Required validations
- Security checks
- Code quality standards
```

#### 3. Development Workflow
```markdown
## Development Workflow
### Commands
npm run dev              # Start development
npm run test            # Run tests
npm run build           # Production build

### Git Workflow
- Branch naming conventions
- Commit message format
- PR requirements
```

#### 4. Architecture Patterns
```markdown
## Architecture
### Directory Structure
/src
  /components         # UI components
  /services          # Business logic
  /utils             # Helpers

### Data Flow
1. Component → Service → API
2. Response → State → UI Update
```

#### 5. Code Examples
```markdown
## Common Patterns
### API Route Example
\`\`\`typescript
export async function GET(request: Request) {
  // Pattern implementation
}
\`\`\`
```

## Real-World Examples

### Example 1: Full-Stack Application
```markdown
# CLAUDE.md

## Project Context
E-commerce platform with Next.js frontend and Python backend

## Service Architecture
- Frontend: Next.js 15 on port 3000
- Backend: FastAPI on port 8000
- Database: PostgreSQL via Supabase

## Critical Rules
1. NEVER use destructive git commands
2. NEVER restart dev server without permission
3. ALWAYS use TypeScript strict mode
4. ALWAYS validate user input

## Development Standards
- Components: Use Shadcn UI first
- State: React Query for server state
- Forms: React Hook Form + Zod
- Styling: Tailwind CSS only

## Testing Requirements
npm run lint         # After changes
npm run typecheck    # Before commits
npm run test         # Feature completion
```

### Example 2: Specialized Subagent
```markdown
---
name: database-migration-expert
description: Handles database schema changes and migrations
tools: [Read, Edit, Bash, mcp__supabase__*]
---

# Database Migration Expert

## Expertise
- PostgreSQL schema design
- Supabase migrations
- Data integrity validation
- Performance optimization

## Workflow
1. Analyze current schema
2. Plan migration strategy
3. Generate migration SQL
4. Test rollback procedures
5. Apply with verification

## Safety Protocols
- Always backup before migrations
- Test on development first
- Validate foreign key constraints
- Check for data loss scenarios
```

## Performance Optimization

### Memory Management
- Keep CLAUDE.md files focused and concise
- Use imports for shared configurations
- Remove outdated instructions regularly

### Context Efficiency
- Structure information hierarchically
- Use clear headings for quick navigation
- Provide examples for complex patterns

### Agent Performance
- Limit tool permissions to necessary ones
- Define clear boundaries between agents
- Use specialized agents for complex tasks

## Common Patterns & Anti-Patterns

### ✅ Good Patterns
1. **Explicit Over Implicit**
   - Document assumptions clearly
   - Specify exact versions and dependencies
   - Provide concrete examples

2. **Safety First**
   - List dangerous operations to avoid
   - Include rollback procedures
   - Emphasize data protection

3. **Progressive Disclosure**
   - Start with essential information
   - Add details through imports
   - Link to external documentation

4. **Task Decomposition**
   - Break complex operations into steps
   - Use agents for specialized domains
   - Provide time estimates

### ❌ Anti-Patterns
1. **Information Overload**
   - Avoid walls of text
   - Don't duplicate framework docs
   - Skip obvious conventions

2. **Ambiguous Instructions**
   - No vague preferences
   - Avoid contradictory rules
   - Don't use unclear terminology

3. **Rigid Constraints**
   - Allow for exceptions
   - Don't over-specify implementation
   - Avoid micromanagement

## Advanced Techniques

### Multi-Agent Orchestration
```markdown
## Agent Collaboration Pattern
1. spec-orchestrator: Define requirements
2. backend-architect: Design API
3. frontend-developer: Build UI
4. test-engineer: Validate implementation
5. devops-specialist: Deploy to production
```

### Dynamic Configuration
```markdown
## Environment-Specific Rules
if (process.env.NODE_ENV === 'production') {
  - No console.log statements
  - Enable error tracking
  - Use production API endpoints
}
```

### Incremental Adoption
1. Start with basic CLAUDE.md
2. Add specialized agents as needed
3. Refine based on usage patterns
4. Document lessons learned

## Tools Integration

### Essential MCP Tools
- **File Operations**: Read, Write, Edit, MultiEdit
- **Version Control**: Git operations via Bash
- **Development**: Bash for running commands
- **Research**: WebSearch, WebFetch
- **Database**: Supabase MCP for data operations

### Tool Permission Strategy
- Grant minimal necessary permissions
- Document tool usage in agent definitions
- Audit tool access regularly

## Maintenance & Evolution

### Regular Reviews
- Weekly: Update task priorities
- Monthly: Refine agent configurations
- Quarterly: Audit memory hierarchy

### Metrics to Track
- Agent invocation frequency
- Task completion rates
- Error patterns
- Time saved estimates

### Community Resources
- [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code)
- [Claude Code Subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- [Official Documentation](https://docs.anthropic.com/en/docs/claude-code)

## Summary

Creating effective Claude Code agents requires:
1. Clear, structured documentation in CLAUDE.md files
2. Specialized subagents for complex domains
3. Safety-first approach with explicit constraints
4. Regular maintenance and refinement
5. Community best practices adoption

Remember: The goal is to enhance productivity while maintaining code quality and safety. Start simple, iterate based on needs, and leverage the community's collective wisdom.