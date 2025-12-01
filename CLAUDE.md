# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeaveMind is an AI-powered Learning Management System (LMS) that enables teachers to create courses through AI-assisted workflows and provides students with component-level AI tutoring. The platform uses a multi-tenant, organization-based architecture supporting role-based access control for teachers and students.

**Tech Stack:**
- **Frontend/Backend:** Next.js 15 (App Router) with TypeScript
- **Database:** Supabase (PostgreSQL + pgvector)
- **Authentication:** Supabase Auth with role-based access control
- **Styling:** Tailwind CSS + shadcn/ui components
- **AI:** Vercel AI SDK + AI Gateway for LLM integration
- **Queue/Workers:** Redis (IORedis) + BullMQ for background jobs
- **Deployment:** Vercel
- **Storage:** Supabase Storage

## Development Commands

### Core Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run AI generation worker
npm run ai-worker
```

### Testing
- **Playwright MCP:** Primary testing tool integrated via MCP servers
- Test both locally and on production deployment after each major change
- Use browser automation to verify complete user workflows

### Deployment Workflow
1. Develop features locally
2. Test locally with playwright mcp
3. Commit and push to GitHub
4. Vercel auto-deploys on push
5. Test deployed site via playwright mcp
6. Create issues for any problems found
7. Clean up test files after verification

## Architecture Overview

### Multi-Tenant Model
The platform uses **organization-based multi-tenancy**:
- **Organizations** represent schools, institutions, or independent teachers
- **Classes** belong to organizations
- **Courses, assignments, and files** belong to classes
- Users have roles per organization: `owner`, `teacher`, `student`
- A user can belong to multiple organizations with different roles

### Database Schema (Core Entities)
```
organizations → classes → courses → chapters → components
                  ↓
              assignments & submissions
```

Key tables:
- `organizations` - Tenant isolation unit
- `organization_members` - User-organization relationships with roles
- `classes` - Class entities within organizations
- `class_members` - Student-class relationships
- `courses` - Course entities (can be linked to outline-based generation)
- `chapters` - Course chapters
- `components` - Smallest content units (text, image, video, question, interactive)
- `assignments` - Tasks for students
- `submissions` - Student assignment submissions
- `files` - Uploaded resources
- `learning_events` - Track student progress and interactions

### AI System Architecture

#### Dual-Agent Course Generation (Phase 4-5)
Located in `/lib/ai/`:

**Builder Agent:** Generates course content based on outlines
**Critic Agent:** Reviews and provides feedback from student perspective
**Orchestrator:** Manages the iteration loop between Builder and Critic

Key files:
- `course-generation-orchestrator.ts` - Main orchestration logic
- `prompts.ts` - All AI prompts for different agents
- `course-editing-tools.ts` - AI tool-calling for course editing
- `editing-tool-definitions.ts` - Tool definitions for AI

#### Background Job Processing
- Worker process in `/workers/ai-generation-worker.ts`
- Queue management in `/lib/queue/`
- Uses BullMQ for job scheduling and Redis for queue storage

### Route Structure

#### App Router Organization
```
/app
├── auth/
│   ├── login/
│   ├── signup/
│   └── signout/
├── role-select/ - First-time role selection
├── teacher/ - Teacher dashboard and management
│   └── [routes for org/class/course management]
├── student/ - Student learning interface
│   └── [routes for classes/courses/assignments]
└── api/ - Backend API routes
    ├── classes/
    ├── courses/
    └── student/
```

### Key Middleware Logic
File: `/middleware.ts`
- Enforces authentication for teacher/student areas
- Implements single-role enforcement (no crossing between teacher/student)
- Redirects unauthenticated users to `/auth/login`
- Forces role selection for users without a role

## Critical Development Rules

### Development Sequence (CRITICAL)
1. **Develop locally first** - All features must work locally before deployment
2. **Test with scripts and playwright mcp** - Verify functionality before commit
3. **Commit and push to GitHub** - Triggers automatic Vercel deployment
4. **Test deployment via playwright mcp** - Verify production works
5. **Create issues for problems** - Document any bugs or issues found
6. **Clean up test files** - Maintain repository cleanliness
7. **Security is top priority** - Diagnose and fix security issues immediately

### Role-Based Access Control
- **Teachers** can only access `/teacher` routes
- **Students** can only access `/student` routes
- **Teachers can preview** student courses (for reviewing their own courses)
- **Single-role enforcement** - Users cannot switch between roles without admin intervention

### Multi-Tenancy & Security
- All data access controlled via Supabase RLS policies
- Organization-based tenant isolation
- Service role key required for admin operations
- Never expose service role key to frontend

### AI Features
- Use Vercel AI Gateway for all LLM calls
- Implement rate limiting for AI operations
- Track AI usage for cost control
- Maintain conversation history for context

## Environment Configuration

### Required Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VERCEL_GATEWAY_KEY=your_vercel_gateway_key
REDIS_URL=redis_connection_string (for workers)
```

### MCP Configuration
Project MCP servers (configured in `.mcp.json`):
- **Supabase:** `https://mcp.supabase.com/mcp?project_ref=odowwkdgduhecrmuatnx`

Claude permissions in `.claude/settings.local.json`:
- Supabase MCP access enabled
- Project MCP servers enabled

## Database Migrations

Location: `/supabase/migrations/`
- Follow sequential numbering (001, 002, 003...)
- Each migration is idempotent where possible
- RLS policies implemented in migration 002
- Use `mcp__supabase__apply_migration` to apply new migrations

## Current Project Status

### Completed Phases
- ✅ **Phase 2:** Multi-tenant LMS Foundation
- ✅ **Phase 5:** Teacher AI Editing Tools & Cross-Chapter Operations
- 🔄 **Phase 3-4:** AI course generation partially implemented
- 🔄 **Phase 6:** Student AI Assistant partially implemented

### Recent Development Focus
- A2A (Agent-to-Agent) iterative content refinement
- Session topic parsing and customization
- TypeScript compatibility with Next.js 15
- Frontend restructuring and testing

### TODO Status
See `/TODO.md` for detailed task breakdown. Current priorities:
- Complete Phase 6 (Student AI Assistant)
- Implement Phase 7 (Real-time Monitoring)
- Enhance security audit (Phase 8)
- Prepare for beta launch

## Key Libraries and Utilities

### `/lib/supabase/`
- `client.ts` - Browser client
- `server.ts` - Server-side client
- `middleware.ts` - Auth/session middleware

### `/lib/ai/`
- AI orchestration and prompt management
- Course generation logic
- Tool-calling implementation

### `/lib/utils.ts`
- `cn()` - Class name merger for Tailwind

### Component Libraries
- `/components/ui/` - shadcn/ui components
- `/components/teacher/` - Teacher-specific components
- `/components/student/` - Student-specific components
- `/components/dashboard/` - Dashboard components

## Security Considerations

### Current Security Measures
- RLS policies for tenant isolation
- Role-based access control via middleware
- Service role key only on server-side
- Authenticated routes protected by middleware

### Security Audit Files
- `/PHASE2_SECURITY_AUDIT.md`
- `/PHASE5_SECURITY_AUDIT.md`
- `/PHASE6_SECURITY_AUDIT.md`

**Important:** Always review security implications when:
- Adding new API routes
- Modifying authentication logic
- Implementing file uploads
- Adding AI features (prompt injection risks)

## Testing Strategy

### Playwright MCP Testing
- Use for end-to-end workflow testing
- Test both locally and on production
- Verify role-based access controls
- Test AI features thoroughly

### Test Areas
1. Authentication flows (signup, login, logout)
2. Role selection and enforcement
3. Class creation and joining
4. Course creation and publishing
5. Student learning flows
6. AI assistant interactions
7. Assignment submission

## Troubleshooting

### Common Issues
1. **Auth redirects not working** - Check middleware.ts logic
2. **Role enforcement bypass** - Verify RLS policies in database
3. **AI features failing** - Check Vercel AI Gateway key and quota
4. **Build errors** - Verify TypeScript types and Next.js compatibility

### Debug Commands
```bash
# Check build
npm run build

# Run linter
npm run lint

# Test Supabase connection
# (use Supabase MCP tools)

# Test deployment
# (check Vercel deployment logs)
```

## Documentation Files

### Architecture
- `/ARCHITECTURE.md` - Technical architecture decisions
- `/ROADMAP.md` - Project roadmap and phases

### Requirements
- `/需求文档.md` - Chinese product requirements document

### Phase Reports
- `/PHASE*_COMPLETION_SUMMARY.md` - Phase completion summaries
- `/PHASE*_TEST_REPORT.md` - Testing reports
- `/PHASE*_SECURITY_AUDIT.md` - Security audit results
- `/RESTRUCTURING_TESTING_REPORT.md` - Recent restructuring details

### Functional Guides
- `/FRONTEND_RECONSTRUCTION_GUIDE.md`
- `/PAGES_FUNCTIONAL_GUIDE.md`
- `/DASHBOARD_REDESIGN_SUMMARY.md`
- `/FIGMA_DESIGN_IMPLEMENTATION_SUMMARY.md`

## Development Tips

### Working with AI Features
- All AI prompts centralized in `/lib/ai/prompts.ts`
- Use tool-calling for complex course editing operations
- Implement rate limiting for production use
- Track token usage for cost control

### Database Changes
- Always create migrations for schema changes
- Test RLS policies after changes
- Use Supabase MCP for migration management
- Verify multi-tenancy isolation

### Frontend Development
- Use TypeScript strictly
- Follow Next.js 15 App Router conventions
- Utilize shadcn/ui components for consistency
- Test responsive design for mobile

### Working with Background Jobs
- Use BullMQ for queue management
- Worker process runs separately (`npm run ai-worker`)
- Monitor job status and failures
- Implement retry logic for failures

## Deployment Notes

- **Vercel** handles deployment automatically on git push
- **Supabase** hosts database and authentication
- **Redis** needed for AI generation worker (external service)
- Check `.vercel/project.json` for Vercel configuration
- Verify environment variables in Vercel dashboard

## Repository Maintenance

- Clean up test files after development
- Update TODO.md as tasks progress
- Document new features in appropriate phase reports
- Keep security audits up to date
- Follow existing commit message conventions

## Additional Resources

- **Supabase MCP:** Project reference `odowwkdgduhecrmuatnx`
- **Vercel Project:** Auto-configured via GitHub integration
- **Database:** PostgreSQL with pgvector for AI context retrieval
- **Queue:** Redis + BullMQ for background job processing

---

For questions about specific features or implementation details, refer to the phase reports and functional guides listed above.
