# Database

PostgreSQL 17 integration-tested; Prisma 6.19.0. Neon pooled `DATABASE_URL` for runtime and direct `DIRECT_URL` for CLI migrations. Run `npm run db:deploy` before using a deployment. Do not use `db push` against an existing production database.

Tables: Workspace, Resume, Contact, Provider, AIUsage, GmailAccount, Application, Outbox, Audit, Reply, Opportunity. This consolidates the brief's broad conceptual model into the implemented workflow.

Ownership: all private tables have Workspace foreign keys. Outbox/Reply reference the composite Application(id,userId), preventing cross-owner association. Unique constraints cover owner/email, owner/provider, owner/resume hash, owner/source/external job ID, outbox application, and stable Message-ID. Indexed frequently filtered owner/status/date fields. No RLS is enabled; only the server may hold database credentials.

Transport statuses: REVIEW_REQUIRED → APPROVED → QUEUED → SENDING → SENT or SEND_UNCERTAIN. Editing an unscheduled draft resets approval. Careers outcomes are separate strings (PENDING, INTERVIEW, REJECTION, etc.) derived from locally reviewed reply classification. SENT is Gmail acceptance, not delivery.

Daily send limits/cooldowns are under a user-scoped transaction advisory lock. AI budgets use a separate owner/provider lock. Atomic conditional claims prevent duplicate sending. Queue state survives restarts. Stale in-flight leases are preserved as uncertain.

Resume content is immutable after upload; only approval may change. Historical resume IDs survive explicit file deletion. There is no FK from Application to Resume to support this intentional tombstone. Never delete an active sending attachment.

Back up Neon according to your plan. Free-tier backup/restore retention must be checked in your Neon project; no permanent backup guarantee. Maintain encryption-key backups separately.

Version 0.2 adds Application.intelligence JSON via a forward-only migration, preserving existing applications with an empty default. Stored evidence locators/hashes permit reconstructing approved-source passages in the review UI without copying private passages into traces. Apply migrations before deploying updated code.

Version 0.3 adds tenant-owned AgentRun records via 20261116020000_agent_runs. Workspace deletion cascades to run history. Application references are informational, not ownership-authorizing foreign keys; all reads and mutation links remain user-scoped.
