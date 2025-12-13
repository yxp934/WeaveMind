# Repository Guidelines

## Project Structure & Module Organization
- App Router pages live in `app/`, with `page.tsx` for the landing page, dedicated chatbot flows (`teacher`, `student`, `self-learner`, `simple-chat`), and API endpoints under `app/api/*`.
- UI primitives and shared components are under `components/`; styling is managed by Tailwind via `app/globals.css`.
- Business logic, AI helpers, Supabase clients, and queue tooling reside in `lib/` (see `lib/ai`, `lib/conversation`, `lib/tools`, `lib/queue`); shared type declarations live in `types/`.
- Background processing runs from `workers/` (e.g., `workers/ai-generation-worker.ts` with BullMQ/Redis) while helper scripts are in `scripts/`.
- Store database schemas and migrations in `supabase/migrations/`; consult `docs/` and the various phase/architecture reports before touching core models.

## Development Workflow
- Always develop and verify features locally before deployment; run the Playwright MCP suite only after local sanity checks pass.
- After local dev and testing, commit changes, run Playwright MCP again, and push to GitHub to trigger Vercel deployment. Wait ≈120 s after push for deployments to land, then rerun Playwright MCP if needed.
- Document problems in GitHub issues and clean up temporary test artifacts before finishing the work.
- Prioritize security: immediately investigate regressions flagged by Playwright MCP, linters, or vulnerability reports.

## Build, Test, and Development Commands
- `npm run dev` — start the Next dev server (port 3000) for UI/SSR work.
- `npm run build` + `npm run start` — compile and serve the production bundle.
- `npm run lint` — Next/ESLint checks (fix locally before PR).
- `npm run ai-worker` — spin up the AI generation worker (requires Redis/Supabase env vars).
- `npx playwright test --config playwright.config.ts` — production-oriented Playwright MCP tests with the real browser; override `--base-url` to point at `http://localhost:3000` for local suites.

## Tool Use & Research
- Before building LangGraph logic, reason via `sequential-thinking MCP` and confirm design decisions through `context7 MCP` documentation searches.
- Use `Playwright MCP` for UI automation (ensure you click the purple send button to avoid the plus shortcut and mimic real users).
- For database tasks rely on `Supabase MCP`; front-end designs follow instructions from `Figma MCP` with provided files.

## Coding Style & Naming Conventions
- TypeScript-first with `strict` mode, React hooks, and functional components; use the `@/` alias for in-repo imports.
- Maintain two-space indentation, single quotes, and Tailwind utility classes; limit inline styles to unavoidable tweaks.
- Split duties: `components/` for UI, `lib/` for logic, `workers/` for background jobs, `scripts/` for tooling. Comments should clarify non-obvious state/queue assumptions.

## Testing Guidelines
- Playwright E2E is the main suite (`tests/` directory per `playwright.config.ts`); prefer feature-named specs (`chatbot-workflows.spec.ts`, `teacher-dashboard.spec.ts`).
- Seed Supabase/Redis when flows depend on them, then run the relevant story from the teacher chatbot, notifications, or onboarding routes.
- Target the main send button (`bg-[#B882B1]` variant) to submit chat messages so flows match the production experience.

## Documentation & Reporting
- Reference `CLAUDE.md`, `/ROADMAP.md`, `/ARCHITECTURE.md`, the Chinese `需求文档.md`, and phase reports when linking architecture or status decisions.
- Report progress, blockers, and test outcomes in Chinese to align with team expectations; include relevant screenshots and linked issues for UI/production changes.

## Commit & Pull Request Guidelines
- Follow existing git history style: short imperative subjects (`fix:`, `feat:`) and descriptive text (e.g., `fix: chatbot context grounding`).
- PR descriptions must cover what changed, why, affected routes/endpoints, linked issue/ticket, testing commands/output (lint + Playwright MCP), and screenshots for any UI work.

## Security & Configuration
- Keep secrets in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, AI gateway keys, Redis URL); never commit credentials.
- When editing `supabase/migrations/`, document schema or env breaks in the PR and rerun the Playwright flows that rely on those tables.
