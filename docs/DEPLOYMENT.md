# Vercel personal deployment

## 1. Accounts and current limits

Reviewed official documentation on 2026-11-16. Pricing changes; recheck the linked pages before deployment.

| Service | Configuration / caveat | Source |
|---|---|---|
| Vercel Hobby | Personal use; cron at most once daily, per-hour precision (±59 minutes). Function/transfer quotas apply. | https://vercel.com/docs/cron-jobs/usage-and-pricing |
| Neon Free | Current pricing advertises 100 projects and 100 CU-hours per project. Storage, compute and transfer caps apply; resume bytes consume database storage. | https://neon.com/pricing |
| Clerk Free | Current pricing advertises up to 50K users; production domains and plan feature limits apply. | https://clerk.com/pricing |
| Gemini | Some models have unpaid quotas. Eligibility varies by model/account/region. Unpaid-service data terms matter. | https://ai.google.dev/gemini-api/docs/models and https://ai.google.dev/gemini-api/terms |
| Groq | Check your account's model and rate-limit settings. Documentation requests returned HTTP 403 from this environment; current data terms/quotas were not independently verified. | https://console.groq.com/docs/models and https://console.groq.com/docs/your-data |

No paid AI provider, object-storage account, orchestration subscription or monitoring service is required by this implementation. No guarantee of zero charges or permanent free availability is made.

## 2. Neon PostgreSQL

Create a project in your preferred region. Copy both the pooled and direct connection strings (TLS required). Set `DATABASE_URL` to pooled, `DIRECT_URL` to direct. Do not paste real credentials into GitHub issues.

From a trusted shell with these variables exported:

```sh
npm ci
npm run db:deploy
```

Prisma CLI reads `.env` by default. Next.js reads `.env.local`; if you choose `.env.local`, explicitly export both database URLs before running Prisma. The checked-in migration creates the schema, constraints, indexes and tenant foreign keys.

## 3. Clerk

Create an application with your preferred sign-in method. Configure a production instance for your stable deployed domain, add the publishable/secret keys to Vercel, and use `/sign-in` as the sign-in path. Hosted Clerk flows provide session handling and account recovery. Set `OWNER_USER_ID` to your Clerk user ID for a single-owner deployment. Without it the app supports isolated signed-in workspaces, not public shared data.

Custom Clerk domains need their exact script/connect/frame origins added to the CSP in `next.config.ts`. Current rules permit standard `*.clerk.accounts.dev` and `*.clerk.com` hosts. Do not disable CSP globally.

## 4. Encryption

Generate a fresh master key locally:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Store it only in Vercel's server environment. Set version `1`. Losing the master key makes stored API keys and Gmail refresh tokens unrecoverable. Keep a secure backup outside Git. Never prefix this variable with `NEXT_PUBLIC_`.

## 5. Vercel

Import the GitHub repository. Framework: Next.js. Root: repository root. Node: 22.x. Install: `npm ci`. Build: `npm run build`. Leave output directory automatic. Configure all essential variables in `.env.example`; `APP_BASE_URL` must be the exact stable HTTPS origin without a trailing slash.

The build generates Prisma Client but deliberately does not apply production migrations. Apply migrations explicitly before the first real sign-in. Preview branches should have separate database/auth/OAuth credentials, not production secrets.

The 4 MB resume limit fits under Vercel's typical 4.5 MB request limit including multipart overhead. Large resumes must be reduced before upload. Private database storage is suitable for a small personal library; a private R2/S3 implementation is future work.

## 6. Gmail

Follow [GMAIL_SETUP.md](GMAIL_SETUP.md). Callback: `https://YOUR_DOMAIN/api/gmail/callback`. Connect in Integrations. Read scope is opt-in for reply monitoring. No Google credentials means Gmail actions fail with setup errors; no fake connection is shown.

## 7. Scheduling

Set `CRON_SECRET` to a random 32-byte hexadecimal value. Vercel cron sends it as a Bearer authorization header. `vercel.json` schedules `30 1 * * *` (01:30 UTC / 07:00 Asia/Kolkata), with Hobby timing variability. Change only within your hosting plan's allowed frequency.

The endpoint processes one approved queued message per invocation, with a 60-second function limit. Normal user-triggered sends run immediately. Daily cron is a recovery aid, not a complete autonomous routine. A separate scheduler can call `/api/worker` with `Authorization: Bearer CRON_SECRET`; see [AUTOMATION.md](AUTOMATION.md).

## 8. Verification before use

1. `GET /api/health`: liveness and configuration-presence booleans only, not proof of database connectivity.
2. Sign in and load Overview: proves Clerk and database access.
3. Save confirmed profile; upload, review, approve and download a non-sensitive test resume.
4. Test a provider key, discover models and verify free eligibility in your provider console.
5. Generate one draft for an address you control. Verify every statement. No job vacancy is assumed.
6. Connect Gmail, enable reviewed sending, approve then send. Confirm one Sent message and the exact attachment.
7. Reply to that message from the controlled recipient. Reconnect with read consent if needed; sync and verify local classification.
8. Pause new sends; verify a new approved application is blocked and stays preserved.
9. Call the worker with and without the correct secret, confirm 200/401 respectively. Never embed the secret in a public URL.
10. Test a second account if you intend multiple users; verify that lists, export and downloads are isolated.

Live Gmail, AI, Clerk and Vercel verification has not been performed in the build environment because no user service credentials were supplied. Browser QA was unavailable. Unit and actual PostgreSQL tests use mocked Gmail/AI endpoints.

## 9. Local deployment alternative

Use Node 22 and PostgreSQL 17. Configure the same Clerk/Google credentials with a localhost callback and `APP_BASE_URL=http://localhost:3000`. Run `npm run db:deploy`, `npm run build`, `npm start`. In a second process run `node scripts/worker.mjs`. A personal computer must remain running for this local worker; for browser-independent cloud processing, put it on a persistent host or use an external scheduler.
