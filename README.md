```markdown
# CursorCode AI

**Build Anything. Automatically. With AI.**

CursorCode AI is the world’s most powerful autonomous AI software engineering platform — powered by xAI's Grok family with intelligent multi-model routing.

It replaces entire development teams by understanding natural language prompts, designing architecture, writing production-grade code, testing, securing, deploying, and maintaining full-stack applications — all with zero manual DevOps.

Unlike Cursor AI (editor with agents), Emergent (conversational builder), Hercules (regulated workflows), or Code Conductor (no-code), CursorCode AI is a **self-directing AI engineering organization** that delivers enterprise-ready SaaS, mobile apps, and AI-native products.

**Live:** https://cursorcode.ai  
**Contact:** info@cursorcode.ai

## Features

- Natural language → full production codebases (Next.js, FastAPI, Postgres, Stripe, auth, RBAC, etc.)
- Multi-agent system (Architect → Frontend/Backend → Security/QA → DevOps)
- Grok-powered: `grok-4-latest` (deep reasoning), `grok-4-1-fast-reasoning` (agentic/tool use), `grok-4-1-fast-non-reasoning` (high-throughput)
- Real-time RAG/memory (pgvector), tools, self-debugging, auto-tests
- Native deployment (*.cursorcode.app), external (Vercel, Railway, etc.)
- Stripe billing (subscriptions + metered usage), SendGrid notifications
- Secure auth (JWT, OAuth, 2FA/TOTP), multi-tenant organizations
- User & admin dashboards, project history, credit metering

## Tech Stack

**Frontend** (Next.js App Router)
- React 18, TypeScript, Tailwind CSS + shadcn/ui
- NextAuth v5 / Auth.js (credentials + Google/GitHub OAuth)
- TanStack Query (data fetching/polling)
- Zod, react-hook-form, sonner (toasts)

**Backend** (FastAPI)
- Python 3.12, SQLAlchemy 2.0 + asyncpg
- Supabase PostgreSQL (managed DB + pgvector for RAG)
- LangGraph + LangChain-xAI (agent orchestration)
- Celery + Upstash Redis (async tasks, retries, rate limiting)
- Stripe (subscriptions + metered billing), SendGrid (email)

**Infra & DevOps**
- Docker + docker-compose (local – only Redis optional)
- Supabase (database), Upstash (Redis)
- GitHub Actions (CI/CD)
- Sentry (error monitoring)

**AI** — xAI Grok family (multi-model routing)

## Quick Start (Local Development with Supabase + Upstash)

### Prerequisites

- Node.js 20+ & pnpm 9+
- Python 3.12+ & pip
- Docker + docker-compose (optional – only for local Redis if you prefer)
- Supabase account (free tier is sufficient)
- Upstash account (free tier works great)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/cursorcode-ai.git
cd cursorcode-ai
pnpm install
```

### 2. Set up Supabase (Database)

1. Create a new project: https://supabase.com/dashboard
2. Go to **Settings → Database**
3. Under **Connection Info** → select **Direct connection** (not pooled)
4. Copy the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres
   ```
5. Paste it as `DATABASE_URL` in `apps/api/.env`

**Note:** Supabase includes `pgvector` out of the box — no extra setup needed for RAG/memory.

### 3. Set up Upstash (Redis)

1. Create a Redis database: https://console.upstash.com/redis
2. Copy the **REST URL** or **Connection String**:
   ```
   redis://default:[password]@[host]:[port]/0
   ```
3. Paste it as `REDIS_URL` in `apps/api/.env`

(If you prefer local Redis for testing, see optional Docker section below.)

### 4. Environment Variables

Copy `.env.example` to `.env` in `apps/api` and `apps/web`.

**Critical variables** (see `.env.example` for full list):

```env
# Backend (apps/api/.env)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres
REDIS_URL=redis://default:[password]@[upstash-host]:[port]/0
XAI_API_KEY=your_xai_api_key_here
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG....
JWT_SECRET_KEY=super-long-random-secret-32-chars-min
JWT_REFRESH_SECRET=another-long-random-secret
NEXTAUTH_SECRET=yet-another-secret-for-frontend

# Frontend (apps/web/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...
```

### 5. Migrations (Supabase)

Use the Supabase dashboard (recommended for simplicity) or CLI:

```bash
# Install Supabase CLI (optional)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push schema/migrations (if using CLI)
supabase db push
```

Or create tables/extensions directly in Supabase Studio (SQL editor).

### 6. Run Dev Servers

```bash
# Backend (FastAPI)
cd apps/api
uvicorn app.main:app --reload --port 8000

# Frontend (Next.js)
cd apps/web
pnpm dev
```

Open http://localhost:3000

Sign up → verify email → login → start prompting!

### Optional: Local Redis (if you prefer not to use Upstash for dev)

```bash
# Start Redis only
docker compose up -d redis
```

(Uses the `redis` service from docker-compose.yml)

## Deployment Guide

### Frontend (Vercel – recommended)

1. Push to GitHub
2. Import repo in Vercel (root directory: `apps/web`)
3. Set env vars (from `.env.local`)
4. Deploy → auto-preview branches

### Backend (Render – easiest with Supabase + Upstash)

1. Create new **Web Service** in Render dashboard
2. Connect GitHub repo → branch `main`
3. Runtime: **Docker**
4. Dockerfile path: `apps/api/Dockerfile`
5. Add environment variables (from `.env.production`):
   - `DATABASE_URL` → Supabase direct connection string
   - `REDIS_URL` → Upstash connection string
   - All other secrets (XAI, Stripe, SendGrid, JWT, etc.)
6. Deploy

**Webhook URL**: `https://your-render-service.onrender.com/webhook/stripe`  
Add to Stripe dashboard → Webhooks.

### Alternative Backends

- **Railway**: Excellent Supabase + Upstash integration
- **Fly.io**: Great for global low-latency
- **Supabase Edge Functions** (future option): for very lightweight endpoints

## Testing

```bash
# Frontend
cd apps/web
pnpm test

# Backend
cd apps/api
pytest
```

## Contributing

1. Fork & branch (`feat/my-feature`)
2. Commit with conventional commits
3. Open PR with clear description
4. Ensure tests pass & lint is clean

## License

MIT (see [LICENSE](LICENSE))

## Support & Contact

Questions? Bugs? → GitHub Issues  
Enterprise / partnerships → info@cursorcode.ai

**Powered by xAI Grok, Supabase & Upstash — Build Anything. Automatically.**
```

### Summary of updates

- Removed all local PostgreSQL setup
- Added clear Supabase + Upstash setup steps
- Docker Compose now only runs Redis (optional) + API + Frontend
- Simplified dev run instructions (no local DB needed)
- Deployment guide emphasizes Supabase + Upstash + Render
- Vision and features kept bold and clear

This README is now clean, modern, and fully Supabase/Upstash-first.

### Next step?

Paste the next file you want updated (e.g. `.env.example`, `apps/api/app/db/session.py` again if needed, or anything else), or say “we’re done” if you feel the project is complete.

You’ve built an impressive, modern, cloud-native AI platform — proud of what we’ve created together! 🚀

