# WeaveMind Architecture Decisions

## Multi-Tenancy Model

**Decision**: Organization-based multi-tenancy

- Each **organization** represents a school, institution, or independent teacher
- Organizations own **classes**, which contain **courses**, **assignments**, and **files**
- Users have roles per organization: `owner`, `teacher`, `student`
- A user can belong to multiple organizations with different roles

**Rationale**:
- Supports both individual teachers (1-person org) and institutions (many teachers)
- Clear permission boundaries via RLS policies
- Scales from MVP to commercial SaaS

## Database Schema (Core Entities)

```
organizations
├── id (uuid, pk)
├── name (text)
├── slug (text, unique)
├── created_at (timestamp)

organization_members
├── id (uuid, pk)
├── organization_id (uuid, fk)
├── user_id (uuid, fk)
├── role (enum: owner, teacher, student)
├── created_at (timestamp)

classes
├── id (uuid, pk)
├── organization_id (uuid, fk)
├── name (text)
├── description (text)
├── created_by (uuid, fk to users)
├── created_at (timestamp)

class_members
├── id (uuid, pk)
├── class_id (uuid, fk)
├── user_id (uuid, fk)
├── role (enum: teacher, student)
├── joined_at (timestamp)

courses
├── id (uuid, pk)
├── class_id (uuid, fk)
├── title (text)
├── description (text)
├── created_by (uuid, fk)
├── published (boolean)
├── created_at (timestamp)

chapters
├── id (uuid, pk)
├── course_id (uuid, fk)
├── title (text)
├── description (text)
├── order_index (integer)
├── created_at (timestamp)

components
├── id (uuid, pk)
├── chapter_id (uuid, fk)
├── type (enum: text, image, video, question, interactive)
├── content (jsonb)
├── order_index (integer)
├── created_at (timestamp)

assignments
├── id (uuid, pk)
├── class_id (uuid, fk)
├── title (text)
├── description (text)
├── due_date (timestamp)
├── created_by (uuid, fk)
├── created_at (timestamp)

submissions
├── id (uuid, pk)
├── assignment_id (uuid, fk)
├── student_id (uuid, fk)
├── content (text)
├── file_url (text)
├── submitted_at (timestamp)
├── grade (numeric)
├── feedback (text)

files
├── id (uuid, pk)
├── class_id (uuid, fk)
├── name (text)
├── storage_path (text)
├── size (bigint)
├── mime_type (text)
├── uploaded_by (uuid, fk)
├── created_at (timestamp)

learning_events
├── id (uuid, pk)
├── user_id (uuid, fk)
├── course_id (uuid, fk)
├── chapter_id (uuid, fk)
├── component_id (uuid, fk)
├── event_type (enum: view, complete, interact)
├── metadata (jsonb)
├── created_at (timestamp)
```

## Tech Stack (Confirmed)

- **Frontend/Backend**: Next.js 15 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: Vercel AI SDK + AI Gateway
- **Deployment**: Vercel
- **Future**: Redis (Upstash) + Worker (Railway/Render) for background jobs

## MVP Scope (Phase 2)

Focus on core LMS without AI:
- ✅ Auth (signup/login with role selection)
- ✅ Organization & class management
- ✅ Manual course creation (chapters + text/image components)
- ✅ Assignment creation & submission
- ✅ File upload & download
- ✅ Basic student progress tracking
- ❌ AI features (deferred to Phase 3+)

