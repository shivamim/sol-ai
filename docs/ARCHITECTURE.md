# Architecture

Browser → Next.js App Router → Clerk authorization → user-scoped services → Prisma → PostgreSQL.

The API is grouped in `src/app/api/[...path]/route.ts`; deterministic domain rules, provider access, authenticated encryption and Gmail/outbox sending are separate modules in `src/lib/`. The responsive client workspace uses React and Lucide; it uses a custom CSS design system rather than importing every UI library suggested in the brief. Future refactoring should split the large workspace component and API dispatcher by feature before commercial expansion.

Clerk IDs identify Workspace rows. All sensitive queries use the authenticated user ID. Workspace foreign keys cascade on account-data deletion. Outbox and Reply use composite application/owner foreign keys. No PostgreSQL RLS claim is made: app-layer authorization is mandatory and the database role must remain server-only.

Private resume versions contain immutable bytes, SHA-256 hashes, locally extracted text and review status. Storage is PostgreSQL (TLS and platform at-rest encryption), not public object URLs. Explicit deletion removes bytes/text; historical applications keep the original resume identifier as a tombstone. This intentional non-FK reference permits deleting a private document while preserving application history.

Gemini and Groq share model discovery and structured-draft interfaces. There is no arbitrary agent execution. Untrusted descriptions/contacts/threads cannot modify prompts or trigger sends. The AI gateway constructs prompts solely from a fixed taxonomy of approved skills/roles, reserves budgets under a PostgreSQL advisory lock, times out requests and Zod-validates output. Draft approval is mandatory because schema validation cannot prove factual accuracy.

Outbox is durable PostgreSQL state, not memory or browser timers. Queueing is transactional. Each sender takes an advisory lock scoped to user and claims a queued row conditionally. It checks current pause, suppression, resume approval, daily limit, company/recipient cooldown and content review before dispatch. There is no retry after a possibly accepted send. Stale in-flight leases become uncertain, not queued. Stable Message-ID metadata supports manual reconciliation.

Vercel hosts bounded HTTP handlers. An authenticated daily cron or persistent external scheduler drains already-approved work. No indefinite worker runs inside a web request.
