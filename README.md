<p align="center">
  <img src="apps/web/public/logo.svg" alt="CursorCode AI Logo" width="180" />
</p>

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

# Backend
cd apps/api
uvicorn app.main:app --reload --port 8000

# Frontend
cd apps/web
pnpm dev

- a **dark-mode optimized logo**
- a **badge-style header**
- or the logo to link to `cursorcode.ai`
