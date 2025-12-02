# WeaveMind TODO / 因材织学 开发任务清单

## Phase 0 – Product Definition & Architecture

- [ ] Finalize domain entities and relationships (users, organizations, classes, courses, chapters, components, assignments, submissions).
- [ ] Decide multi-tenant model (organization-based vs per-teacher) and document trade-offs.
- [ ] Draft high-level architecture and data flow diagrams.
- [ ] Write an architecture decision record (ADR) for the chosen stack (Next.js, Supabase, Vercel AI Gateway, Redis queue).

## Phase 1 – Project Setup & Core Infrastructure

- [ ] Initialize Next.js App Router project with TypeScript, ESLint, Prettier, Tailwind CSS, and shadcn/ui.
- [ ] Configure environment management (.env files, Vercel environment variables).
- [ ] Create Supabase project and seed initial database.
- [ ] Implement `profiles`, `organizations`, `classes`, and `class_memberships` tables and migrations.
- [ ] Integrate Supabase Auth; build signup/login/logout and role selection (teacher vs student).
- [ ] Implement minimal `/teacher` and `/student` dashboard pages.
- [ ] Configure GitHub repository, GitHub Actions (lint, type-check, test, build), and Vercel deployment.

## Phase 2 – Multi-tenant LMS Foundation

- [ ] Design schemas and migrations for `courses`, `chapters`, `components`, `assignments`, `submissions`, and `files`.
- [ ] Implement API layer (route handlers or tRPC) for CRUD on LMS entities with proper authorization checks.
- [ ] Build teacher UI for managing organizations, classes, and class membership invitations.
- [ ] Implement course editor UI for manual creation and reordering of chapters and components (text + basic exercises).
- [ ] Implement assignment creation UI (rich text requirements, deadlines, allowed submission methods).
- [ ] Implement student course viewer with chapter tree, component display, and basic progress visualization.
- [ ] Build student assignment list, detail view, file upload, and online-editor submission flow.
- [ ] Implement teacher file management UI (upload, list, delete) and student file preview/download.
- [ ] Add learning event logging for component open/complete and simple progress indicators per student and course.
- [ ] Configure and test Supabase RLS policies for tenant and role isolation.

## Phase 3 – Teacher AI: Requirement Gathering & Outline

- [x] Integrate Vercel AI Gateway and Vercel AI SDK in the backend.
- [x] Design prompts and context builders for requirement-gathering conversations.
- [x] Implement teacher-side AI chat UI for starting a new AI-assisted course.
- [x] Implement backend handlers that convert chat history into a structured outline (chapters + descriptions).
- [ ] Persist outlines in the database and link them to draft courses.
- [ ] Implement outline editing UI with drag-and-drop reorder, rename, add/remove chapter.
- [ ] Support natural-language outline editing commands translated to structured changes.

**Recent Enhancement (2025-12-02):**
- [x] Enhanced schedule generation to collect comprehensive course context:
  * Target audience (age, background, prior knowledge, skill level)
  * Specific learning goals and outcomes
  * Detailed overview of each session
- [x] Added explicit user confirmation step before schedule generation
- [x] Integrated all collected context into AI generation prompts for better course-specific content
- [x] No hardcoded responses - all information dynamically extracted from user conversation
- [x] Improved session descriptions to include target audience, goals, and session overviews

## Phase 4 – AI Course Generation (Dual-Agent)

- [ ] Choose orchestration pattern (state machine or graph) and implement in TypeScript.
- [ ] Set up Redis and BullMQ (or similar) for background job processing.
- [ ] Implement Builder agent logic to generate draft chapter components from the outline and context.
- [ ] Implement Critic agent logic to review drafts and produce structured feedback.
- [ ] Implement the iteration loop with configurable max rounds and token limits.
- [ ] Build teacher UI to start generation per chapter or full course and monitor job status.
- [ ] Persist Builder/Critic messages and generated components in structured form for later review.

## Phase 5 – Teacher AI Editing Tools & Cross-Chapter Operations ✅ COMPLETED (2025-11-26)

- [x] Define structured JSON representation of a course suitable for AI tool calls.
- [x] Implement editing tools (insert/move/delete component, edit text, add examples, regenerate questions).
- [x] Register tools with the AI provider via Vercel AI Gateway and handle tool-calling responses.
- [x] Implement teacher UI for high-level natural-language commands on a course or subset of chapters.
- [x] Add preview and confirmation flows for bulk edits and maintain simple version history.

**Implementation Details:**
- Created 6 AI editing tools: insertComponent, moveComponent, deleteComponent, updateComponentContent, addExamplesToConcept, getCourseStructure
- Implemented course versioning system with snapshot-based rollback capability
- Added edit history tracking for audit trail
- Built CourseEditorAssistant UI component for natural language editing
- Integrated AI editor into course detail page
- Applied database migration for course_versions and course_edit_history tables
- All tools use Vercel AI SDK v5 with proper inputSchema and execute functions
- Supports cross-chapter operations (e.g., adding examples to all chapters mentioning a concept)

**Documentation:**
- PHASE5_COMPLETION_REPORT.md - Full implementation details
- PHASE5_SECURITY_AUDIT.md - Security analysis and recommendations
- PHASE5_TEST_PLAN.md - Comprehensive testing plan

**Commit:** ea2f32a

## Phase 6 – Student Component-Level AI Assistant

- [ ] Implement per-component “Ask AI” button and chat UI with streaming responses.
- [ ] Implement backend context assembly for student questions (full component + compressed course context + recent Q&A).
- [ ] Create and maintain pgvector-backed tables in Supabase for course summaries and key concepts.
- [ ] Persist student AI conversations and link them to student, course, chapter, and component.
- [ ] Add basic safeguards and guardrails (maximum messages per hour, content filters where necessary).

## Phase 7 – Real-Time Monitoring & Analytics

- [ ] Expand learning event logging to include AI usage, assignment submissions, and key interactions.
- [ ] Integrate Supabase Realtime or websockets to push updates to teacher dashboards.
- [ ] Build class-level and per-student progress dashboards with filters by course and time range.
- [ ] Implement simple alerts or flags for at-risk students (e.g., stuck on components or many incorrect attempts).
- [ ] Add exports or summary reports for teachers (CSV or simple charts).

## Phase 8 – Hardening, Beta Launch, and Cost Controls

- [ ] Add Sentry (or similar) for error tracking on frontend and backend.
- [ ] Implement rate limiting and per-teacher AI quotas to keep monthly LLM spend within budget.
- [ ] Write E2E tests for core flows (signup, class creation, course creation, learning, AI ask, assignment submission).
- [ ] Conduct security review of auth, RLS policies, file access, and AI prompt inputs.
- [ ] Localize key UI flows into Chinese and English; polish UX for beta users.
- [ ] Run a closed beta with a small set of real teachers and collect feedback.

## Phase 9 – China & Global Scale-Out (Longer Term)

- [ ] Evaluate separate deployments or CDNs for better performance in Mainland China.
- [ ] Extend AI gateway abstraction to support domestic LLM providers where Vercel AI Gateway can proxy or where alternative gateways are needed.
- [ ] Plan and document data residency and compliance approach for different regions.
- [ ] Implement observability dashboards for performance, latency, and LLM usage across regions.

