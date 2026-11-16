import { trackPreparation, listAgentRuns } from "@/lib/run-history";
import { prepareApplication } from "@/lib/workflow";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { user, json, failure, rateLimit, audit } from "@/lib/api";
import { assertOrigin, encrypt, equalSecret } from "@/lib/security";
import {
  profileSchema,
  contactSchema,
  emailSchema,
  quality,
  classifyReply,
} from "@/lib/domain";
import { listModels } from "@/lib/ai";
import { decrypt } from "@/lib/security";
import { accessToken, gmailRequest, processOutbox } from "@/lib/gmail";
export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
export async function GET(req: NextRequest, ctx: Context) {
  try {
    const path = (await ctx.params).path.join("/");
    if (path === "health")
      return json({
        service: "SOL Ai",
        status: "ok",
        configured: {
          database: !!process.env.DATABASE_URL,
          auth: !!process.env.CLERK_SECRET_KEY,
          gmail: !!process.env.GOOGLE_CLIENT_ID,
          encryption: !!process.env.ENCRYPTION_MASTER_KEY,
        },
      });
    if (path === "worker") {
      if (
        !process.env.CRON_SECRET ||
        !equalSecret(
          req.headers.get("authorization") || "",
          `Bearer ${process.env.CRON_SECRET}`,
        )
      )
        return json({ error: "Unauthorized" }, 401);
      await db.$transaction([
        db.application.updateMany({
          where: {
            status: "SENDING",
            updatedAt: { lt: new Date(Date.now() - 300000) },
          },
          data: {
            status: "SEND_UNCERTAIN",
            error:
              "Worker lease expired; inspect Gmail Sent. No automatic retry.",
          },
        }),
        db.outbox.updateMany({
          where: {
            status: "SENDING",
            leaseAt: { lt: new Date(Date.now() - 300000) },
          },
          data: { status: "SEND_UNCERTAIN" },
        }),
      ]);
      const rows = await db.outbox.findMany({
        where: { status: "QUEUED" },
        take: 1,
        orderBy: { createdAt: "asc" },
      });
      const results = [];
      for (const row of rows) {
        try {
          results.push(await processOutbox(row.userId, row.applicationId));
        } catch (e) {
          results.push({
            id: row.applicationId,
            error: e instanceof Error ? e.message : "Blocked",
          });
        }
      }
      return json({ processed: results });
    }
    const uid = await user();
    if (path === "agent-runs") return json({ runs: await listAgentRuns(uid) });
    if (path === "state") {
      const [
        workspace,
        resumes,
        contacts,
        providers,
        gmail,
        applications,
        activity,
        replies,
        jobs,
        usage,
        agentRuns,
      ] = await Promise.all([
        db.workspace.upsert({
          where: { id: uid },
          create: { id: uid },
          update: {},
        }),
        db.resume.findMany({
          where: { userId: uid },
          select: {
            id: true,
            name: true,
            role: true,
            approved: true,
            createdAt: true,
            text: true,
          },
        }),
        db.contact.findMany({
          where: { userId: uid },
          orderBy: { createdAt: "desc" },
          take: 1000,
        }),
        db.provider.findMany({
          where: { userId: uid },
          select: {
            kind: true,
            model: true,
            enabled: true,
            freeConfirmed: true,
            dailyRequests: true,
            dailyTokens: true,
            maxOutput: true,
          },
        }),
        db.gmailAccount.findUnique({
          where: { userId: uid },
          select: { email: true, readEnabled: true, syncedAt: true },
        }),
        db.application.findMany({
          where: { userId: uid },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
        db.audit.findMany({
          where: { userId: uid, resource: { not: "rate-limit" } },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
        db.reply.findMany({
          where: { userId: uid },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.opportunity.findMany({
          where: { userId: uid },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        db.aIUsage.findMany({
          where: {
            userId: uid,
            createdAt: { gte: new Date(Date.now() - 86400000) },
          },
          take: 1000,
        }),
        listAgentRuns(uid),
      ]);
      return json({
        workspace,
        resumes,
        contacts,
        providers,
        gmail,
        applications,
        activity,
        replies,
        jobs,
        usage,
        agentRuns,
      });
    }
    if (path.startsWith("resumes/")) {
      const resume = await db.resume.findFirst({
        where: { id: path.split("/")[1], userId: uid },
      });
      if (!resume) return json({ error: "Resume not found" }, 404);
      return new Response(new Uint8Array(resume.content), {
        headers: {
          "Content-Type": resume.mime,
          "Content-Disposition": `attachment; filename="${resume.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (path === "export") {
      const [workspace, contacts, applications, providers] = await Promise.all([
        db.workspace.findUnique({ where: { id: uid } }),
        db.contact.findMany({ where: { userId: uid } }),
        db.application.findMany({ where: { userId: uid } }),
        db.provider.findMany({
          where: { userId: uid },
          select: { kind: true, model: true },
        }),
      ]);
      return new Response(
        JSON.stringify(
          { workspace, contacts, applications, providers },
          null,
          2,
        ),
        {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": "attachment; filename=sol-ai-export.json",
            "Cache-Control": "no-store",
          },
        },
      );
    }
    if (path === "gmail/connect") {
      if (
        !process.env.GOOGLE_CLIENT_ID ||
        !process.env.GOOGLE_CLIENT_SECRET ||
        !process.env.APP_BASE_URL
      )
        throw new Error(
          "Configure Google OAuth and APP_BASE_URL before connecting Gmail",
        );
      const state = randomBytes(32).toString("hex"),
        jar = await cookies(),
        read = req.nextUrl.searchParams.get("read") === "true";
      jar.set("sol_oauth", JSON.stringify({ state, uid, read }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/api/gmail",
      });
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.APP_BASE_URL + "/api/gmail/callback",
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        state,
        scope: [
          "openid",
          "email",
          "https://www.googleapis.com/auth/gmail.send",
          ...(read ? ["https://www.googleapis.com/auth/gmail.readonly"] : []),
        ].join(" "),
      }).toString();
      return Response.redirect(url);
    }
    if (path === "gmail/callback") {
      const jar = await cookies(),
        saved = jar.get("sol_oauth")?.value;
      jar.delete("sol_oauth");
      if (!saved) throw new Error("OAuth state expired; reconnect Gmail");
      const state = z
        .object({ state: z.string(), uid: z.string(), read: z.boolean() })
        .parse(JSON.parse(saved));
      if (
        state.uid !== uid ||
        !equalSecret(state.state, req.nextUrl.searchParams.get("state") || "")
      )
        throw new Error("Invalid OAuth state");
      const code = req.nextUrl.searchParams.get("code");
      if (!code) throw new Error("Gmail authorization was cancelled");
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: process.env.APP_BASE_URL + "/api/gmail/callback",
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error("Google token exchange failed; reconnect Gmail");
      const tokens = await response.json();
      if (!tokens.refresh_token)
        throw new Error(
          "Google did not return a refresh token. Revoke access and reconnect.",
        );
      const info = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!info.ok) throw new Error("Could not verify Gmail identity");
      const identity = await info.json();
      const email = emailSchema.parse(identity.email);
      const data = {
        email,
        refreshToken: encrypt(tokens.refresh_token),
        readEnabled: state.read,
      };
      await db.gmailAccount.upsert({
        where: { userId: uid },
        create: { userId: uid, ...data },
        update: data,
      });
      await audit(uid, "GMAIL_CONNECTED", email);
      return Response.redirect(
        new URL("/?view=integrations", process.env.APP_BASE_URL),
      );
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest, ctx: Context) {
  try {
    assertOrigin(req);
    if (Number(req.headers.get("content-length") || 0) > 4500000)
      throw new Error("Request exceeds 4.5 MB");
    const uid = await user(),
      path = (await ctx.params).path.join("/");
    await rateLimit(uid, "API_WRITE");
    if (path === "resumes") {
      const form = await req.formData(),
        file = form.get("file"),
        role = z.string().min(1).max(120).parse(form.get("role"));
      if (!(file instanceof File) || file.size > 4 * 1024 * 1024 || !file.size)
        throw new Error("Upload a nonempty PDF, DOCX or TXT up to 4 MB");
      const buffer = Buffer.from(await file.arrayBuffer());
      let text = "",
        mime = "";
      if (
        file.name.toLowerCase().endsWith(".pdf") &&
        buffer.subarray(0, 5).toString() === "%PDF-"
      ) {
        mime = "application/pdf";
        const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
        text = (await pdf(buffer)).text;
      } else if (
        file.name.toLowerCase().endsWith(".docx") &&
        buffer.subarray(0, 2).toString() === "PK"
      ) {
        mime =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        text = (await (await import("mammoth")).extractRawText({ buffer }))
          .value;
      } else if (
        file.name.toLowerCase().endsWith(".txt") &&
        !buffer.includes(0)
      ) {
        mime = "text/plain";
        text = buffer.toString("utf8");
      } else throw new Error("File type or signature is not supported");
      if (text.length > 100000 || !text.trim())
        throw new Error(
          "Resume text is empty or too large; use a text-based document",
        );
      const hash = createHash("sha256").update(buffer).digest("hex");
      await db.resume.create({
        data: {
          userId: uid,
          name: file.name.slice(0, 180),
          role,
          mime,
          content: buffer,
          text,
          hash,
        },
      });
      await audit(uid, "RESUME_UPLOADED", file.name);
      return json({
        message:
          "Resume uploaded. Review extracted text and approve it before use.",
      });
    }
    const input = await req.json();
    if (path === "profile") {
      const profile = profileSchema.parse(input);
      await db.workspace.upsert({
        where: { id: uid },
        create: { id: uid, profile },
        update: { profile },
      });
      await audit(uid, "PROFILE_CONFIRMED", uid);
      return json({ message: "Confirmed profile saved" });
    }
    if (path === "contacts") {
      const data = z
        .object({
          permitted: z.literal(true),
          rows: z.array(contactSchema).min(1).max(1000),
        })
        .parse(input);
      const result = await db.$transaction(async (tx) => {
        const result = await tx.contact.createMany({
          data: data.rows.map((r) => ({ ...r, userId: uid })),
          skipDuplicates: true,
        });
        await tx.audit.create({
          data: {
            userId: uid,
            action: "CONTACTS_IMPORTED",
            resource: "contacts",
            detail: `${result.count} permitted records`,
          },
        });
        return result;
      });
      return json({
        message: `Imported ${result.count} contacts; duplicates skipped. No emails were sent.`,
      });
    }
    if (path === "resumes/approve") {
      const { id, approved } = z
        .object({ id: z.string(), approved: z.boolean() })
        .parse(input);
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${uid + "sending"}))`;
        const r = await tx.resume.updateMany({
          where: { id, userId: uid },
          data: { approved },
        });
        if (!r.count) throw new Error("Resume not found");
      });
      return json({
        message: approved ? "Resume approved" : "Resume approval removed",
      });
    }
    if (path === "providers") {
      const d = z
        .object({
          kind: z.enum(["gemini", "groq"]),
          key: z.string().min(10).max(300),
          model: z
            .string()
            .min(1)
            .max(150)
            .regex(/^[a-zA-Z0-9._\/-]+$/),
          freeConfirmed: z.boolean(),
          enabled: z.boolean().default(true),
          dailyRequests: z.number().int().min(1).max(500),
          dailyTokens: z.number().int().min(2000).max(1000000),
          maxOutput: z.number().int().min(256).max(1500),
        })
        .parse(input);
      const models = await listModels(d.kind, d.key);
      if (!models.includes(d.model))
        throw new Error("The selected model was not returned by your provider");
      const { key, ...rest } = d;
      await db.provider.upsert({
        where: { userId_kind: { userId: uid, kind: d.kind } },
        create: { userId: uid, ...rest, secret: encrypt(key) },
        update: { ...rest, secret: encrypt(key) },
      });
      return json({
        message: "Connection verified and encrypted settings saved",
      });
    }
    if (path === "providers/models") {
      const d = z
        .object({
          kind: z.enum(["gemini", "groq"]),
          key: z.string().optional(),
        })
        .parse(input);
      const provider = await db.provider.findUnique({
        where: { userId_kind: { userId: uid, kind: d.kind } },
      });
      const key = d.key || (provider ? decrypt(provider.secret) : "");
      if (!key) throw new Error("Enter a key first");
      return json({ models: await listModels(d.kind, key) });
    }
    if (path === "applications/generate") {
      await rateLimit(uid, "GENERATE", 5);
      const d = z
        .object({
          email: emailSchema,
          company: z.string().max(160),
          role: z.string().min(1).max(120),
          description: z.string().max(20000).default(""),
          jobUrl: z
            .union([
              z.literal(""),
              z
                .url()
                .refine(
                  (v) => new URL(v).protocol === "https:",
                  "HTTPS required",
                ),
            ])
            .default(""),
          provider: z.enum(["groq", "gemini"]),
          resumeId: z.string().optional(),
          permitted: z.literal(true),
          mode: z.enum(["assisted", "agentic"]).default("assisted"),
        })
        .parse(input);
      const workspace = await db.workspace.findUnique({ where: { id: uid } });
      const profile = profileSchema.parse(workspace?.profile);
      const resumes = await db.resume.findMany({
        where: { userId: uid, approved: true },
        select: {
          id: true,
          name: true,
          role: true,
          text: true,
          approved: true,
          hash: true,
        },
      });
      const existing = await db.contact.findUnique({
        where: { userId_email: { userId: uid, email: d.email } },
      });
      if (existing?.suppressed) throw new Error("This recipient is suppressed");
      const result = await trackPreparation(uid, d.mode, async (checkpoint) => {
        const { resume, draft, body, intelligence } = await prepareApplication({
          userId: uid,
          provider: d.provider,
          skills: profile.skills,
          role: d.role,
          description: d.description,
          signature: profile.signature || profile.name,
          resumeId: d.resumeId,
          resumes,
          mode: d.mode,
          onStep: checkpoint,
        });
        const companyKey =
          d.company.trim().toLowerCase() || d.email.split("@")[1];
        const result = await db.$transaction(async (tx) => {
          await tx.contact.upsert({
            where: { userId_email: { userId: uid, email: d.email } },
            create: {
              userId: uid,
              email: d.email,
              company: d.company,
              source: "User-confirmed Quick Apply",
            },
            update: {},
          });
          const app = await tx.application.create({
            data: {
              userId: uid,
              recipient: d.email,
              company: d.company,
              companyKey,
              role: d.role,
              description: d.description,
              jobUrl: d.jobUrl,
              resumeId: resume.id,
              intelligence,
              subject: draft.subject,
              body,
              provider: draft.provider,
              model: draft.model,
              messageId: `sol.${randomUUID()}@${new URL(process.env.APP_BASE_URL || "http://localhost:3000").hostname}`,
            },
          });
          await tx.audit.create({
            data: { userId: uid, action: "DRAFT_PREPARED", resource: app.id },
          });
          return app;
        });
        return result;
      });
      return json({
        message: "Draft prepared. Review every claim before approval.",
        application: result,
      });
    }
    if (path === "applications/edit") {
      const d = z
        .object({
          id: z.string(),
          subject: z.string().max(180),
          body: z.string().max(6000),
        })
        .parse(input);
      const errors = quality(d.subject, d.body);
      if (errors.length) throw new Error(errors.join("; "));
      const r = await db.application.updateMany({
        where: {
          id: d.id,
          userId: uid,
          status: { in: ["REVIEW_REQUIRED", "APPROVED"] },
        },
        data: {
          subject: d.subject,
          body: d.body,
          status: "REVIEW_REQUIRED",
          approvedAt: null,
          claimConfirmed: false,
        },
      });
      if (!r.count) throw new Error("Only unscheduled drafts can be edited");
      await db.agentRun.updateMany({
        where: { userId: uid, applicationId: d.id },
        data: {
          status: "WAITING_REVIEW",
          summary:
            "The draft was edited. Review the new text against the original evidence before approving again.",
        },
      });
      return json({
        message: "Saved. Content changes require fresh approval.",
      });
    }
    if (path === "applications/approve") {
      const d = z
        .object({ id: z.string(), claimsConfirmed: z.literal(true) })
        .parse(input);
      await db.$transaction(async (tx) => {
        const app = await tx.application.findFirst({
          where: { id: d.id, userId: uid, status: "REVIEW_REQUIRED" },
        });
        if (!app) throw new Error("Draft not found or already approved");
        const errors = quality(app.subject, app.body);
        if (errors.length) throw new Error(errors.join("; "));
        if (
          !(await tx.resume.findFirst({
            where: { id: app.resumeId, userId: uid, approved: true },
          }))
        )
          throw new Error("Resume must be approved");
        await tx.application.update({
          where: { id: d.id },
          data: {
            status: "APPROVED",
            claimConfirmed: true,
            approvedAt: new Date(),
          },
        });
        await tx.agentRun.updateMany({
          where: { userId: uid, applicationId: d.id },
          data: {
            status: "APPROVED",
            summary:
              "Content approved by the user. Sending remains a separate action in the application tracker.",
          },
        });
        await tx.audit.create({
          data: { userId: uid, action: "DRAFT_APPROVED", resource: d.id },
        });
      });
      return json({
        message:
          "Application approved. Sending still requires a separate action.",
      });
    }
    if (path === "applications/send") {
      const { id } = z.object({ id: z.string() }).parse(input);
      await db.$transaction(async (tx) => {
        const workspace = await tx.workspace.findUnique({ where: { id: uid } });
        if (workspace?.paused !== false)
          throw new Error(
            "Sending is paused. Resume reviewed sending in Automation first.",
          );
        const changed = await tx.application.updateMany({
          where: { id, userId: uid, status: "APPROVED", claimConfirmed: true },
          data: { status: "QUEUED" },
        });
        if (!changed.count)
          throw new Error(
            "Application must be approved and cannot already be sent",
          );
        await tx.outbox.create({ data: { userId: uid, applicationId: id } });
      });
      try {
        return json(await processOutbox(uid, id));
      } catch (e) {
        await db.application.updateMany({
          where: { id, userId: uid, status: "QUEUED" },
          data: { error: e instanceof Error ? e.message : "Blocked" },
        });
        throw e;
      }
    }
    if (path === "applications/retry") {
      const { id } = z.object({ id: z.string() }).parse(input);
      return json(await processOutbox(uid, id));
    }
    if (path === "automation") {
      const d = z
        .object({
          paused: z.boolean(),
          dailyLimit: z.number().int().min(1).max(20),
        })
        .parse(input);
      await db.workspace.upsert({
        where: { id: uid },
        create: { id: uid, ...d },
        update: d,
      });
      await audit(
        uid,
        d.paused ? "SENDING_PAUSED" : "REVIEWED_SENDING_ENABLED",
        uid,
      );
      return json({
        message: d.paused
          ? "New sends paused. Requests already in flight may complete."
          : "Reviewed sending enabled. Every application still requires approval.",
      });
    }
    if (path === "gmail/sync") {
      const { token, account } = await accessToken(uid);
      if (!account.readEnabled)
        throw new Error("Reconnect Gmail with reply monitoring enabled");
      const apps = await db.application.findMany({
        where: { userId: uid, threadId: { not: null } },
        take: 20,
        orderBy: { sentAt: "desc" },
      });
      let count = 0;
      for (const app of apps) {
        const thread = await gmailRequest(
          token,
          `threads/${encodeURIComponent(app.threadId!)}?format=full`,
        );
        for (const m of thread.messages || []) {
          if (m.id === app.gmailId || m.labelIds?.includes("SENT")) continue;
          if (
            !m.internalDate ||
            Number(m.internalDate) < (app.sentAt?.getTime() || 0)
          )
            continue;
          const headers = m.payload?.headers || [],
            from =
              headers.find(
                (h: { name: string }) => h.name.toLowerCase() === "from",
              )?.value || "";
          if (from.toLowerCase().includes(account.email.toLowerCase()))
            continue;
          const snippet = String(m.snippet || "").slice(0, 1500),
            category = classifyReply(from + " " + snippet);
          await db.$transaction(async (tx) => {
            const exists = await tx.reply.findUnique({ where: { id: m.id } });
            if (exists) return;
            await tx.reply.create({
              data: {
                id: m.id,
                userId: uid,
                applicationId: app.id,
                category,
                snippet,
              },
            });
            await tx.application.update({
              where: { id: app.id },
              data: { outcome: category },
            });
            if (["OPT_OUT", "BOUNCE"].includes(category))
              await tx.contact.updateMany({
                where: { userId: uid, email: app.recipient },
                data: { suppressed: true },
              });
            count++;
          });
        }
      }
      await db.gmailAccount.update({
        where: { userId: uid },
        data: { syncedAt: new Date() },
      });
      return json({
        message: `Synchronized ${apps.length} application threads; ${count} new replies. Classification requires review.`,
      });
    }
    if (path === "jobs/discover") {
      const d = z
        .object({
          source: z.enum(["greenhouse", "lever"]),
          company: z
            .string()
            .min(1)
            .max(80)
            .regex(/^[a-zA-Z0-9_-]+$/),
          permitted: z.literal(true),
        })
        .parse(input);
      const url =
        d.source === "greenhouse"
          ? `https://boards-api.greenhouse.io/v1/boards/${d.company}/jobs?content=true`
          : `https://api.lever.co/v0/postings/${d.company}?mode=json`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok)
        throw new Error(
          `Job source returned ${response.status}; verify the board identifier`,
        );
      const text = await response.text();
      if (text.length > 5000000) throw new Error("Source response too large");
      const data = JSON.parse(text);
      const rows = (d.source === "greenhouse" ? data.jobs : data).slice(
        0,
        200,
      ) as Record<string, unknown>[];
      let count = 0;
      for (const row of rows) {
        const link = String(row.absolute_url || row.hostedUrl || "");
        if (!link.startsWith("https://")) continue;
        const job = {
          userId: uid,
          source: d.source + ":" + d.company,
          externalId: String(row.id),
          company: d.company,
          title: String(row.title || row.text || ""),
          location: String(
            (row.location as { name?: string })?.name ||
              (row.categories as { location?: string })?.location ||
              "",
          ),
          url: link,
          description: String(row.content || row.descriptionPlain || "")
            .replace(/<[^>]*>/g, " ")
            .slice(0, 30000),
        };
        await db.opportunity.upsert({
          where: {
            userId_source_externalId: {
              userId: uid,
              source: job.source,
              externalId: job.externalId,
            },
          },
          create: job,
          update: job,
        });
        count++;
      }
      return json({
        message: `Saved ${count} real postings. Availability and eligibility require review.`,
      });
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: NextRequest, ctx: Context) {
  try {
    assertOrigin(req);
    if (Number(req.headers.get("content-length") || 0) > 4500000)
      throw new Error("Request exceeds 4.5 MB");
    const uid = await user(),
      path = (await ctx.params).path.join("/"),
      input = await req.json();
    if (path === "providers") {
      const { kind } = z
        .object({ kind: z.enum(["gemini", "groq"]) })
        .parse(input);
      await db.provider.deleteMany({ where: { userId: uid, kind } });
      return json({ message: "API key deleted" });
    }
    if (path === "gmail") {
      const account = await db.gmailAccount.findUnique({
        where: { userId: uid },
      });
      if (account) {
        const result = await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: decrypt(account.refreshToken) }),
          signal: AbortSignal.timeout(15000),
        });
        if (!result.ok && result.status !== 400)
          throw new Error(
            "Google revocation failed. Revoke SOL Ai in your Google Account, then retry.",
          );
      }
      await db.gmailAccount.deleteMany({ where: { userId: uid } });
      return json({ message: "Gmail disconnected and token removed" });
    }
    if (path === "resumes") {
      const { id } = z.object({ id: z.string() }).parse(input);
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${uid + "sending"}))`;
        if (
          await tx.application.count({
            where: {
              userId: uid,
              resumeId: id,
              status: { in: ["QUEUED", "SENDING"] },
            },
          })
        )
          throw new Error("Resume is used by an active send");
        await tx.resume.deleteMany({ where: { id, userId: uid } });
      });
      return json({
        message:
          "Private resume deleted. Historical attachment reference retained.",
      });
    }
    if (path === "contacts") {
      const { id } = z.object({ id: z.string() }).parse(input);
      await db.contact.deleteMany({ where: { id, userId: uid } });
      return json({
        message:
          "Contact deleted. Existing historical applications are retained.",
      });
    }
    if (path === "account") {
      if (input.confirm !== "DELETE") throw new Error("Type DELETE to confirm");
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${uid + "sending"}))`;
        if (
          await tx.application.count({
            where: { userId: uid, status: "SENDING" },
          })
        )
          throw new Error("A send is in flight; retry after it completes");
        // Workspace cascades remove every owned row; the lock excludes a concurrent send claim.
        await tx.workspace.deleteMany({ where: { id: uid } });
      });
      return json({
        message:
          "Application data deleted. Manage your login account separately in Clerk.",
      });
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return failure(e);
  }
}
