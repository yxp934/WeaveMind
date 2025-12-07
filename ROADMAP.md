# WeaveMind Roadmap / 因材织学 路线图

## Guiding Principles & Constraints

- TypeScript-only stack (Next.js + Node.js, no Python services).
- Multi-tenant, commercial SaaS from day one (independent teachers, schools, organizations).
- Users in Mainland China and globally; design for variable latency and model provider flexibility.
- Vercel AI Gateway as unified LLM access layer.
- Minimize cloud cost (target ≤ US$20/month initially via free tiers and strict LLM usage controls).

## Phase 0 – Product Definition & Architecture (0.5–1 week)

**Goals**
- Finalize domain model (users, organizations, classes, courses, chapters, components, assignments, submissions).
- Decide tenancy model (per-organization or per-teacher) and RBAC strategy.
- Choose concrete infrastructure (Vercel region, Supabase project, Redis provider).

**Scope**
- Entity–relationship diagram and API surface sketch.
- Teacher and student journey flow diagrams.
- High-level architecture diagram (Next.js app, job worker, DB, AI gateway, queue).

**Acceptance**
- Architecture document approved; no major unknowns for Phase 1–3.

## Phase 1 – Project Setup & Core Infrastructure (1 week)

**Goals**
- Create baseline monorepo or single app for web + worker.
- Set up database, auth, and deployment pipelines.

**Scope**
- Initialize Next.js App Router project with TypeScript, Tailwind CSS, and shadcn/ui.
- Create Supabase project; define initial schema for users/profiles, organizations, classes, memberships.
- Integrate Supabase Auth with Next.js, including roles (teacher, student, admin).
- Set up GitHub repository, Vercel project, Supabase environment variables, and GitHub Actions (lint, test, build).

**Acceptance**
- You can sign up, log in, and see separate empty dashboards for teacher and student.
- CI passes on each push; deployments to Vercel preview and production work.

## Phase 2 – Multi-tenant LMS Foundation (2–3 weeks)

**Goals**
- Deliver a traditional LMS without AI, supporting multiple independent tenants.

**Scope**
- Implement schemas and APIs for courses, chapters, components (basic types), assignments, submissions, and files.
- Build teacher UI for managing organizations/classes, manually creating courses, chapters, components, assignments, and file uploads.
- Build student UI for class list, content list, course viewer with chapter tree, assignments list, submission flows, and file downloads.
- Add simple learning events (component viewed/completed) and basic progress indicators.
- Implement RLS policies in Supabase to isolate data per tenant and role.

**Acceptance**
- A teacher can onboard, create an organization, create a class, upload content, invite a student, and run a course end-to-end without AI.
- Students can complete a course and submit assignments; permissions are correctly enforced.

## Phase 3 – Teacher AI: Requirement Gathering & Outline (1–2 weeks)

**Goals**
- Enable AI-driven conversational requirement collection and outline generation for new courses.

**Scope**
- Integrate Vercel AI Gateway via the Vercel AI SDK in the backend.
- Implement an AI chat UI for teachers to describe course goals, audience, duration, style, and topics.
- Design prompt templates and context builders for requirement gathering.
- Generate structured course outlines (chapters with descriptions) and persist them.
- Allow outline editing via both UI (drag/drop, edit) and natural-language commands interpreted by the model.

**Acceptance**
- From a blank course, a teacher can converse with AI to obtain and then edit a usable outline that is stored in the database.

## Phase 4 – AI Course Generation (Dual-Agent Builder & Critic) (2–4 weeks)

**Goals**
- Automatically generate component-level content for each chapter using dual agents.

**Scope**
- Implement a TypeScript-based orchestration layer (state machine or graph) for Builder and Critic roles.
- Use a background worker (Node.js) plus queue (e.g., Redis + BullMQ) for long-running generation tasks.
- Define structured message formats for draft content and critic feedback.
- Limit iterations per chapter and enforce token limits to control LLM cost.
- Provide teacher UI to start generation, track status, inspect Builder/Critic dialogues, and accept or discard results.

**Acceptance**
- For a selected outline, the system can generate full chapter content with multiple components per chapter and show the dual-agent conversation.

## Phase 5 – Teacher AI Editing Tools & Cross-Chapter Operations (2–3 weeks)

**Goals**
- Allow teachers to refine generated courses using powerful AI tool-calling.

**Scope**
- Model the course as structured JSON; expose editing tools (insert/move/delete components, edit text, add examples, regenerate questions).
- Implement OpenAI-style tool calling via Vercel AI Gateway to let AI invoke these tools safely.
- Add teacher UI for issuing high-level natural language instructions (including cross-chapter edits).
- Implement change previews and versioning for major edits.

**Acceptance**
- Teachers can express complex edits like “add concrete examples for concept A in all chapters” and see consistent, safe changes applied to the course.

## Phase 6 – Student Component-Level AI Assistant (2–3 weeks)

**Goals**
- Provide contextual AI help for students at the component level.

**Scope**
- Implement per-component “Ask AI” chat UI with streaming responses.
- Build context assembly: full component content plus compressed course context (outline, chapter summaries, key concepts, selected components).
- Retrieve compressed context via pgvector in Supabase.
- Store per-student, per-course conversation history and reuse for follow-up questions.

**Acceptance**
- Students can ask questions under any component and receive coherent answers that align with the course as a whole; conversations are persisted.

## Phase 7 – Real-Time Monitoring & Analytics (2–3 weeks)

**Goals**
- Give teachers near real-time visibility into student progress.

**Scope**
- Expand learning event logging (component open/complete, AI questions, assignment submissions).
- Use Supabase Realtime or websockets to push updates to teacher dashboards.
- Build visual dashboards showing progress by class, course, chapter, and student.
- Add basic anomaly detection rules (e.g., students stuck too long on a component).

**Acceptance**
- Teacher dashboards update automatically as students learn; teachers can quickly identify at-risk students.

## Phase 8 – Hardening, Beta Launch, and Cost Controls (1–2 weeks)

**Goals**
- Prepare for external beta with clear cost and reliability controls.

**Scope**
- Implement rate limiting and per-teacher AI quotas to keep LLM spend within budget.
- Add comprehensive logging, error tracking (e.g., Sentry), and privacy reviews.
- Improve accessibility, localization (at least Chinese and English UI), and documentation.
- Run end-to-end tests for core flows; fix critical bugs.

**Acceptance**
- Platform is stable in a closed beta with a handful of real classes; monthly infra plus LLM costs remain within budget.

## Phase 9 – China & Global Scale-Out (ongoing)

**Goals**
- Optimize for both Mainland China and global users as adoption grows.

**Scope**
- Evaluate region-specific deployments or CDNs for better latency in China.
- Add support in the AI gateway layer for domestic LLM providers if needed.
- Plan data residency and compliance strategies for education and privacy regulations.

**Acceptance**
- Clear plan and early implementation steps for region-aware routing, provider selection, and compliance as the platform scales.

## Phase 10 – Frontend Restructuring & Backend Enhancement (8 weeks)

**Goals**
- Complete frontend restructuring with AI-dominant interface, onboarding flow, discussion system, notification system, and settings management.
- Provide complete backend support for all new frontend features with robust architecture.

**Scope**

### 10.1 Data Model Extension (2 weeks, 60 person-hours)
- Design and implement discussion system tables (discussion_threads, discussion_posts, discussion_participants)
- Design and implement notification system tables (notifications, notification_preferences)
- Design and implement settings management tables (user_settings, onboarding_progress)
- Add self-learner role support (self_learner_pathways, self_learner_favorites)
- Implement comprehensive RLS policies and security strategies
- Create database migration scripts and apply to production

### 10.2 API Endpoint Development (3 weeks, 90 person-hours)
- Develop discussion system APIs (10 endpoints: thread CRUD, post CRUD, participant management)
- Develop notification system APIs (8 endpoints: notification management, preference settings, batch operations)
- Develop settings management APIs (4 endpoints: get/update settings, onboarding progress)
- Develop self-learner APIs (6 endpoints: learning paths, course favorites, public content)
- Enhance AI chat APIs (unified tool calling, specialized assistant endpoints)

### 10.3 AI Tool System Upgrade (2 weeks, 60 person-hours)
- Implement discussion management tools (create threads, publish posts, content moderation)
- Implement notification management tools (send notifications, update preferences)
- Implement settings management tools (update settings, track onboarding)
- Implement class management tools (create class, manage members)
- Establish unified tool registry center
- Implement tool usage audit logs and rate limiting

### 10.4 Real-time Features Implementation (2 weeks, 50 person-hours)
- Integrate Supabase Realtime for real-time discussion updates
- Implement real-time notification push system
- Optimize connection management and performance
- Implement offline message queue

### 10.5 Security & Performance Optimization (1 week, 30 person-hours)
- Implement discussion content moderation
- Configure AI tool call rate limiting
- Optimize RLS policies and access control
- Implement data access auditing
- Optimize database indexes and implement Redis caching

### 10.6 Frontend Implementation (Parallel, 4 weeks)
- Implement onboarding flow with role selection (teacher/student/self-learner)
- Implement discussion system frontend interface
- Implement notification system frontend interface
- Implement settings management frontend interface
- Integrate AI dialog box with tool calling
- Ensure all navigation and routing work correctly

**Acceptance**
- All discussion features work properly with real-time updates
- Notification system provides real-time push notifications
- Settings management functions completely
- Self-learner role operates normally
- AI tool calling is smooth and secure
- All frontend navigation and routing work correctly
- API response time < 200ms
- Real-time feature latency < 500ms
- Support 1000+ concurrent users
- RLS policies completely cover all new tables
- Content moderation is effective

## Phase 11 – Teacher Dashboard AI Chatbot Implementation (1-2 weeks)

**Goals**
- Transform the teacher dashboard from using hardcoded/preset data to fully functional real-time data
- Implement a complete AI chatbot interface with tool-calling capabilities
- Enable natural language operations for course, session, and assignment management

**Current State Analysis**
The teacher dashboard (`/app/teacher/page.tsx`) currently has:
- ✅ Complete UI structure with navigation, sidebar, and floating action menu
- ✅ Beautiful card components for classes, sessions, and assignments
- ❌ All data is hardcoded (3 sample classes, 3 sessions, 3 assignments)
- ❌ AI chat sidebar shows "Coming soon" placeholder with no input box
- ❌ No database integration for real data

**Database Schema (Already Exists)**
All required tables are available:
- `organizations`, `organization_members` - Multi-tenant structure
- `classes`, `class_members` - Class management
- `courses`, `chapters`, `components` - Course content
- `course_sessions` - Session scheduling (referenced but needs verification)
- `assignments`, `assignment_questions` - Assignment system
- `ai_usage_logs`, `ai_conversations` - AI tracking

**Scope**

### 11.1 Database Integration (1-2 days)
- Replace hardcoded `classes` array with Supabase query for user's actual classes
- Replace hardcoded `upcomingSessions` array with real session data from `course_sessions`
- Replace hardcoded `assignments` array with real assignment data
- Add proper loading states and error handling
- Verify `course_sessions` table exists, create migration if needed

### 11.2 AI Chat Interface Implementation (2-3 days)
- Remove "AI Chatbot coming soon" placeholder
- Integrate existing `UnifiedAIChat` component or create new `TeacherDashboardChat` component
- Implement chat input box with send button
- Add message history display with user/AI message bubbles
- Implement streaming responses for AI messages
- Add preset prompt suggestion buttons:
  - "How is Jimmy's assignment progress?"
  - "Create a schedule for my Machine Learning class"
  - "What assignments are due this week?"
  - "Show me my overall performance"

### 11.3 AI Tool-Calling Functions (3-4 days)
Create new tools specifically for teacher dashboard operations:

**Information Extraction Tools:**
- `getClassProgress` - Get progress summary for a class
- `getStudentStatus` - Check specific student's status
- `getUpcomingDeadlines` - List upcoming assignment deadlines
- `getSessionSchedule` - Get scheduled sessions for a class

**Creation Tools:**
- `createClass` - Create new class with AI-generated details
- `createSession` - Create new session for a class
- `createAssignment` - Generate assignment with AI-powered questions
- `createCourse` - Create course outline with AI assistance

**Management Tools:**
- `updateAssignment` - Modify assignment details
- `publishAssignment` - Publish assignment to students
- `scheduleSession` - Schedule or reschedule sessions

### 11.4 Context Menu ("+" Button) Implementation (1-2 days)
- Add "+" button in chat input area
- Implement context menu with three tabs: Classes, Sessions, Assignments
- Show scrollable list of items in each tab
- Allow adding items as context to the current chat message
- Display selected context as removable tags above input

### 11.5 Real Data Flow Integration (1-2 days)
- Connect chat context to actual database operations
- Ensure all AI tool calls update the database correctly
- Implement real-time UI updates when data changes
- Add proper error handling and rollback for failed operations

**Technical Implementation Details**

**API Endpoints Needed:**
```typescript
// Existing endpoints to use:
POST /api/ai/chat - Unified AI chat with tool-calling
GET /api/classes/[id] - Get class details
GET /api/classes/[id]/sessions - Get sessions for class
GET /api/assignments/generate - Generate AI assignment
POST /api/teacher/class-progress - Get class progress

// May need new endpoints:
POST /api/teacher/dashboard/overview - Aggregated dashboard data
POST /api/ai/teacher-assistant - Teacher-specific AI chat
```

**Tool Definitions Pattern:**
```typescript
// lib/ai/teacher-dashboard-tools.ts
export const getClassProgressTool = tool({
  description: 'Get progress summary for a specific class',
  inputSchema: z.object({
    classId: z.string().describe('The class ID'),
  }),
  execute: async ({ classId }) => {
    // Query class_progress_summary view
    return { success: true, data: progressData }
  },
})
```

**Chat Component Structure:**
```typescript
// components/teacher/TeacherDashboardChat.tsx
- Header with Weaver AI branding
- Message area with welcome state and conversation
- Context tags display (selected classes/sessions/assignments)
- Context menu trigger ("+" button)
- Input field with send button
- Preset suggestion buttons (when empty)
```

**Acceptance Criteria**
- ✅ Dashboard displays real data from Supabase (zero hardcoded data)
- ✅ AI chat interface has functional input box and sends messages
- ✅ Chat shows proper message history with user/AI bubbles
- ✅ Preset prompt buttons work and trigger AI responses
- ✅ "+" button opens context menu with Classes/Sessions/Assignments tabs
- ✅ Selected context appears as removable tags
- ✅ AI tool-calling works for:
  - Extracting class/student/assignment information
  - Creating new classes, sessions, and assignments
  - Updating and publishing assignments
- ✅ All operations persist to database correctly
- ✅ Security: RLS policies enforced, teacher-only access verified
- ✅ All tests pass locally with Playwright MCP
- ✅ All tests pass on production deployment

**Security Checklist**
- [ ] All AI tool calls verify user authentication
- [ ] Tool calls respect organization/class ownership
- [ ] RLS policies prevent cross-tenant data access
- [ ] Input sanitization for AI-generated content
- [ ] Rate limiting on AI chat endpoints
- [ ] Prompt injection protection in tool descriptions

**Reference Files**
- Design reference: `/DesignTeacherDashboard/` - Complete Figma-based prototype
- Current dashboard: `/app/teacher/page.tsx` - Main dashboard with hardcoded data
- AI patterns: `/lib/ai/` - Existing AI integration code
- Existing chat: `/components/ai/UnifiedAIChat.tsx` - Reusable chat component
- Tool definitions: `/lib/ai/editing-tool-definitions.ts` - Tool pattern reference

