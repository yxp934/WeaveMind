# WeaveMind LMS

WeaveMind is an AI-powered Learning Management System (LMS) that enables teachers to create courses through AI-assisted workflows and provides students with component-level AI tutoring.

## Features

### 🎓 Core Learning Management
- **Multi-tenant Architecture**: Organization-based tenant isolation
- **Role-based Access Control**: Teacher and student roles with specific permissions
- **Course Management**: Create, edit, and manage courses with AI assistance
- **Assignment System**: Comprehensive assignment creation and submission workflow
- **Real-time Progress Tracking**: Monitor student learning progress and engagement

### 🤖 AI-Powered Features
- **AI Course Generation**: Automated course content creation using AI agents
- **Student AI Assistant**: Personalized tutoring and guidance for students
- **AI Assignment Research**: Research assistance for assignment completion
- **Compression Context System**: Intelligent context compression for better AI interactions

### 💬 Discussion System
- **Discussion Threads**: Organize discussions by general, course, assignment, or announcement types
- **Nested Replies**: Support for up to 10 levels of nested discussions
- **Post Reactions**: Like, dislike, and other reaction types
- **Participant Management**: Track user participation and reading status
- **Tree-structured Display**: Hierarchical post organization

### 📊 Analytics & Monitoring
- **Learning Analytics**: Comprehensive learning progress tracking
- **Real-time Monitoring**: Live student activity and engagement monitoring
- **Performance Metrics**: Detailed analytics for teachers and administrators

## Tech Stack

- **Frontend/Backend**: Next.js 15 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL + pgvector)
- **Authentication**: Supabase Auth with role-based access control
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: Vercel AI SDK + AI Gateway for LLM integration
- **Queue/Workers**: Redis (IORedis) + BullMQ for background jobs
- **Deployment**: Vercel
- **Storage**: Supabase Storage

## API Endpoints

### Discussion System API
- `POST /api/discussions/threads` - Create discussion thread
- `GET /api/discussions/threads` - List discussion threads
- `GET /api/discussions/threads/[id]` - Get thread details
- `PUT /api/discussions/threads/[id]` - Update thread
- `DELETE /api/discussions/threads/[id]` - Delete thread
- `POST /api/discussions/threads/[id]/posts` - Create post
- `GET /api/discussions/threads/[id]/posts` - List posts
- `PUT /api/discussions/posts/[id]` - Update post
- `DELETE /api/discussions/posts/[id]` - Delete post
- `GET /api/discussions/threads/[id]/participants` - List participants
- `POST /api/discussions/threads/[id]/read` - Mark thread as read

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Redis instance (for background jobs)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd WeaveMind
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VERCEL_GATEWAY_KEY=your_vercel_gateway_key
REDIS_URL=redis_connection_string
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── teacher/           # Teacher dashboard
│   └── student/           # Student interface
├── components/            # React components
├── lib/                   # Utilities and configurations
├── types/                 # TypeScript type definitions
├── supabase/              # Database migrations
└── workers/               # Background job workers
```

## Key Features Implementation

### Multi-Tenant Architecture
The platform uses organization-based multi-tenancy:
- Organizations represent schools or institutions
- Classes belong to organizations
- Courses, assignments, and discussions belong to classes
- Users have roles per organization

### Discussion System
- Supports 4 discussion types: general, course, assignment, announcement
- Nested reply structure with up to 10 levels
- Soft delete implementation
- Automatic participant management
- Tree-based post structure

### AI Integration
- Uses Vercel AI Gateway for LLM calls
- Implements rate limiting for AI operations
- Tracks AI usage for cost control
- Maintains conversation history for context

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Background Jobs
```bash
npm run ai-worker
```

## Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Database Schema](./DISCUSSION_SYSTEM_DATABASE_DESIGN.md)
- [API Documentation](./DISCUSSION_SYSTEM_API_COMPLETION_REPORT.md)
- [Security Audit](./PHASE6_SECURITY_AUDIT.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
