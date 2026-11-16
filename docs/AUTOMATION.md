# Background execution

Current mode: manual/assisted, with explicit approval per message. New sends start paused. Automation settings enable reviewed sending and a daily 1–20 application cap (default 8). A server-side emergency pause prevents starting new sends; an in-flight Gmail request may finish.

`GET /api/worker` requires `Authorization: Bearer CRON_SECRET`. It marks abandoned >5-minute SENDING leases uncertain and processes at most one QUEUED outbox record. It never sends a mere draft. Credential/eligibility/quota errors preserve queued work; uncertain dispatches are never automatically retried.

The Vercel configuration schedules 01:30 UTC daily. Hobby timing may vary by up to one hour. The web UI's approved send is immediate, so daily cron mainly recovers work blocked before dispatch. A queue with many messages requires more invocations; the endpoint is not a bulk mailer.

For a persistent host with Node 22:

```sh
APP_BASE_URL=https://your-domain.example CRON_SECRET=YOUR_SECRET node scripts/worker.mjs
```

The script polls once per minute, serially, and exits on SIGINT/SIGTERM. Keep secrets in the host's secret settings, not command histories in shared environments. An external scheduler can instead make the same authenticated GET request. A local host must remain running; Vercel cron runs independently of your browser/computer.

Not implemented: scheduled source discovery, unattended inbox sync, daily summaries, policy-authorized unreviewed automatic sends, follow-up generation/sending, durable provider retries, Inngest/Trigger.dev integration. The worker must not be described as the full autonomous routine in the original brief.
