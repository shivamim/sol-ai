# SOL Ai

A private personal job-search workspace with local lexical RAG and bounded AI planning built for Vercel, with Next.js App Router, strict TypeScript, Clerk, Prisma/PostgreSQL, Gemini/Groq BYOK and Gmail OAuth.

**This is a tested initial implementation of the reviewed application workflow, not completion of the entire autonomous-platform specification.** External accounts and live integration verification are required. Full unreviewed Autopilot and automatic follow-ups are not implemented. See the [acceptance matrix](docs/IMPLEMENTATION_STATUS.md).

## RAG and agent workflow

Version 0.2 adds approved-document chunking/retrieval, source references, multi-resume LLM planning with allowlisted actions, bounded citation correction and a visible evidence/workflow trace. Raw private passages remain local. This is lexical RAG, not vector search; the planner is human-supervised, not a full autonomous application system. [Architecture and limits](docs/RAG_AND_AGENTS.md) · [Portfolio presentation](docs/PORTFOLIO.md).

**Existing deployments:** apply the new `20261116010000_rag_evidence` migration with `npm run db:deploy` before using the updated app.

## What works in code

- Editable confirmed professional profile and signature.
- Private immutable PDF/DOCX/TXT resume versions, local server parsing, text review, approval and authenticated downloads.
- Permitted CSV/XLSX/pasted-email contact import, aliases, preview, email normalization, deduplication and transactional insertion.
- Real official Gemini/Groq model discovery, encrypted API keys, configured models and atomic daily request/token reservations.
- Local BM25-style retrieval over approved resume passages/profile skills, with immutable source locators and evidence references in the review screen.
- A bounded AI planner for multiple approved resumes, one citation-repair attempt, and a persisted workflow trace ending at human approval.
- A restrictive AI boundary: only fixed role/skill categories go to either provider; no raw resumes, identities, job notes or Gmail threads.
- Draft generation → editable preview → separate factual approval → explicit Gmail send with the approved attachment.
- Persistent outbox, send leases, server pause, daily cap, 30-day recipient/company cooldown and uncertain-result preservation.
- Gmail OAuth with send-only scope by default; optional read consent for manual application-thread reply sync and deterministic classification/suppression.
- Public Greenhouse/Lever board discovery and transparent skill overlap.
- Real database-derived tracker, overview, activity, export and data deletion.

## Run locally

```sh
npm ci
cp .env.example .env.local
# Fill in your own service configuration. Never commit .env.local.
# Prisma CLI reads .env, not .env.local. Export database URLs in your shell,
# or use a local .env containing only DATABASE_URL and DIRECT_URL.
npm run db:deploy
npm run dev
```

Open `http://localhost:3000`. Without Clerk configuration the home page displays an inactive empty workspace; data endpoints fail closed. No mock data or authentication bypass is enabled.

## Deploy on Vercel

1. Import `shivamim/sol-ai` into Vercel as a Next.js project (Node 22.12 or newer in the 22.x release line).
2. Create Neon and Clerk projects. Set the variables in [.env.example](.env.example) in Vercel.
3. Run `npm run db:deploy` against your Neon database from a trusted terminal. Build does **not** mutate the database automatically.
4. Deploy. Configure your Clerk production domain, Google callback and `APP_BASE_URL` with the stable Vercel URL.
5. Sign in, set `OWNER_USER_ID`, confirm profile, approve a resume, connect an AI model and Gmail.
6. Enable reviewed sending in Automation, prepare a draft, verify and approve the content, then send a single test application to an address you control.

See the complete [deployment guide](docs/DEPLOYMENT.md) and [Gmail setup](docs/GMAIL_SETUP.md).

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

`npm test` runs unit tests and **skips PostgreSQL tests unless `TEST_DATABASE_URL` is provided**. For the integration suite, create a disposable PostgreSQL database, migrate it, then run:

```sh
DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DATABASE_URL" npm run db:deploy
DATABASE_URL="$TEST_DATABASE_URL" npm test
```

Integration tests delete only workspaces named `test_sol_a` and `test_sol_b`. Use a disposable database anyway. All Gmail/AI calls in tests are mocked; tests never send real emails.

## Cost and scheduling

The stack is free-tier-first, not guaranteed free. Account quotas and provider billing settings are authoritative. Vercel Hobby cron runs at most daily with up to one-hour timing variation. The included daily cron processes **one already-approved queued application**; normal reviewed sends execute immediately. It does not discover sources, sync replies or generate a daily autonomous report. For frequent approved-outbox processing, run [the worker](scripts/worker.mjs) on a persistent machine or an authorized external scheduler. See [automation](docs/AUTOMATION.md).

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [Implementation status](docs/IMPLEMENTATION_STATUS.md) · [Security](docs/SECURITY.md) · [AI providers](docs/AI_PROVIDERS.md) · [Database](docs/DATABASE.md) · [Troubleshooting](docs/TROUBLESHOOTING.md)
