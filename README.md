<p align="center">
  <img src="apps/web/public/logo.svg" alt="CursorCode AI Logo" width="180" />
</p>

<h1 align="center">CursorCode AI</h1>

<p align="center">
  <strong>Build Anything. Automatically. With AI.</strong>
</p>

<p align="center">
  <a href="https://cursorcode.ai">🌐 Live</a> ·
  <a href="mailto:info@cursorcode.ai">📧 Contact</a>
</p>

---

## What is CursorCode AI?

**CursorCode AI** is a fully autonomous AI software engineering platform — powered by **xAI’s Grok family** with intelligent multi-model routing.

It goes far beyond copilots and no-code tools.

CursorCode AI understands natural language prompts, **designs system architecture, writes production-grade code, tests, secures, deploys, and maintains full-stack applications** — end to end, with **zero manual DevOps**.

Unlike:
- **Cursor AI** (editor + agents)
- **Emergent** (conversational builder)
- **Hercules** (regulated workflows)
- **Code Conductor** (no-code)

CursorCode AI operates as a **self-directing AI engineering organization**, capable of delivering enterprise-ready **SaaS platforms, mobile apps, and AI-native products** autonomously.

---

## Core Capabilities

- **Natural language → complete production codebases**
  - Next.js, FastAPI, PostgreSQL, Stripe, Auth, RBAC, and more
- **Multi-agent architecture**
  - Architect → Frontend → Backend → Security/QA → DevOps
- **Grok-powered multi-model routing**
  - `grok-4-latest` – deep reasoning & architecture
  - `grok-4-1-fast-reasoning` – agent execution & tools
  - `grok-4-1-fast-non-reasoning` – high-throughput tasks
- **Real-time memory & RAG**
  - pgvector, long-term project memory, self-debugging
- **Automated testing & self-healing**
- **Native & external deployments**
  - `*.cursorcode.app`, Vercel, Railway, Render, Fly.io
- **Built-in billing & notifications**
  - Stripe (subscriptions + metered usage), SendGrid
- **Enterprise-grade security**
  - JWT, OAuth, 2FA/TOTP, RBAC, multi-tenant orgs
- **User & admin dashboards**
  - Project history, usage analytics, credit metering

---

## Technology Stack

### Frontend — Next.js (App Router)
- React 18, TypeScript
- Tailwind CSS + shadcn/ui
- NextAuth v5 / Auth.js (Credentials, Google, GitHub)
- TanStack Query
- Zod, react-hook-form, sonner

### Backend — FastAPI
- Python 3.12
- SQLAlchemy 2.0 + asyncpg
- Supabase PostgreSQL + pgvector
- LangGraph + LangChain-xAI
- Celery + Upstash Redis
- Stripe, SendGrid

### Infrastructure & DevOps
- Docker & docker-compose
- Supabase (Postgres)
- Upstash (Redis)
- GitHub Actions (CI/CD)
- Sentry (monitoring)

### AI Layer
- **xAI Grok family** with intelligent routing

---

## Quick Start — Local Development

### Prerequisites
- Node.js **20+** & pnpm **9+**
- Python **3.12+**
- Docker (optional)
- Supabase account
- Upstash account

---

### 1. Clone & Install

```bash
git clone https://github.com/your-org/cursorcode-ai.git
cd cursorcode-ai
pnpm install
