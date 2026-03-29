# StatisTrack

A full-stack job application tracker with **Gmail-assisted status updates**: scheduled jobs enqueue work per user, a worker reads new mail via the Gmail API, **keyword scoring** filters likely recruiting mail, and **Claude (Anthropic)** parses structured fields to create or update applications in PostgreSQL. The dashboard includes stats, filtering, and a **Sankey-style application flow** visualization.

This is not only CRUD + auth—it includes **background processing**, **external APIs**, **rate limiting**, and **LLM-based extraction**.

## Highlights

- **Multi-user auth** — NextAuth.js with credentials and OAuth (Google account used for Gmail access when linked).
- **Applications API** — REST handlers for listing, creating, updating, and deleting `JobApplication` rows (Prisma + Postgres).
- **Email pipeline (optional)** — Vercel Cron hits a secured route → **Upstash Queue** → long-running **Node worker** (`app/worker.js` → `consumer.ts`) → Gmail API → heuristic scoring → **Claude** JSON extraction → upserts in the database, with **Upstash Redis rate limiting** on Gmail calls.
- **Dashboard** — Responsive UI: filters, date range, search, sortable table, empty states, and Application Flow chart.

## Tech stack

| Layer | Choice |
|--------|--------|
| App | Next.js 14 (App Router), React 18, TypeScript |
| UI | Tailwind CSS, lucide-react |
| Auth | NextAuth.js, `@next-auth/prisma-adapter`, bcrypt (credentials) |
| Data | PostgreSQL (Supabase), Prisma ORM |
| Async | Upstash Redis **Queue**, `@upstash/ratelimit` |
| Integrations | Google APIs (Gmail), Anthropic SDK (Claude) |
| Deploy | Vercel (see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)) |

For database and pooling notes, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md). For Google/GitHub OAuth, see [OAUTH_SETUP.md](./OAUTH_SETUP.md).

## Architecture

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for a diagram and flow (cron → queue → worker → Gmail → Claude → Prisma).

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL (local or Supabase)
- For the email pipeline: Upstash Redis, Google OAuth with Gmail access, Anthropic API key (see Architecture doc)

### Install

```bash
git clone <your-repo-url>
cd job-app-tracker
npm install
```

### Environment

```bash
cp .env.example .env
```

Then set at least:

- **Database:** `DATABASE_URL` (and `DIRECT_URL` for migrations if you use a Supabase pooler—see Prisma schema comments)
- **Auth:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, provider secrets as in [OAUTH_SETUP.md](./OAUTH_SETUP.md)
- **Cron → queue:** `CRON_SECRET`; **Upstash:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Gmail worker:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (refresh token stored via linked Google account)
- **Claude:** `CLAUDE_API_KEY`, `EMAIL_PARSE_PROMPT`, `MAX_TOKENS`

### Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Commit migration files under `prisma/migrations/` for production deploys.

### Dev server

```bash
npm run dev
```

Opens the app on port **3002** (see `package.json`).

### Background worker (Gmail sync)

The queue consumer runs outside the Next.js server:

```bash
npx tsx app/worker.js
```

Run this where it can reach Postgres, Upstash, Google, and Anthropic—locally for development or a separate process/host in production. Cron configuration is described in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for Vercel env vars and migration notes (direct vs pooled DB URLs).

## Project structure (abbreviated)

```
job-app-tracker/
├── app/
│   ├── api/              # Next.js route handlers (auth, applications, cron)
│   ├── connection.ts     # Upstash Redis, queue, rate limiter
│   ├── consumer.ts       # Queue consumer: Gmail + Claude + Prisma
│   ├── evalutation.ts    # Claude API (email → structured JSON)
│   ├── worker.js         # Process entry: runs consumer loop
│   └── ...
├── components/           # Dashboard, Sankey, login, etc.
├── lib/                  # Prisma client, auth helpers, Gmail text + trigger words
├── prisma/               # schema.prisma, migrations
└── ...
```

## License

MIT
