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

