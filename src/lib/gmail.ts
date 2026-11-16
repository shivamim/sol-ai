import { db } from "./db";
import { decrypt, cleanHeader } from "./security";
import { quality } from "./domain";
export async function accessToken(userId: string) {
  const account = await db.gmailAccount.findUnique({ where: { userId } });
  if (!account) throw new Error("Connect Gmail first");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: decrypt(account.refreshToken),
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Gmail authorization expired or revoked. Reconnect Gmail; queued work is preserved.",
    );
  const data = await response.json();
  return { token: data.access_token as string, account };
}
export async function gmailRequest(
  token: string,
  path: string,
  init: RequestInit = {},
) {
  const r = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/" + path,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    },
  );
  if (!r.ok) throw new Error(`Gmail request failed (${r.status})`);
  return r.json();
}
export function mimeMessage(input: {
  from: string;
  to: string;
  subject: string;
  body: string;
  messageId: string;
  filename: string;
  mime: string;
  content: Buffer;
}) {
  const boundary = "sol_" + input.messageId.replace(/[^a-z0-9]/gi, "");
  const encoded = (s: string) => Buffer.from(s).toString("base64");
  const wrap = (s: string) => s.match(/.{1,76}/g)?.join("\r\n") || "";
  const subjectChunks: string[] = [];
  let chunk = "";
  for (const character of cleanHeader(input.subject)) {
    if (Buffer.byteLength(chunk + character) > 42) {
      subjectChunks.push(`=?UTF-8?B?${encoded(chunk)}?=`);
      chunk = "";
    }
    chunk += character;
  }
  if (chunk) subjectChunks.push(`=?UTF-8?B?${encoded(chunk)}?=`);
  return [
    `Date: ${new Date().toUTCString()}`,
    `From: ${cleanHeader(input.from)}`,
    `To: ${cleanHeader(input.to)}`,
    `Subject: ${subjectChunks.join("\r\n ")}`,
    `Message-ID: <${cleanHeader(input.messageId)}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap(encoded(input.body)),
    `--${boundary}`,
    `Content-Type: ${cleanHeader(input.mime)}`,
    `Content-Disposition: attachment; filename="${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
    "Content-Transfer-Encoding: base64",
    "",
    wrap(input.content.toString("base64")),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}
export async function processOutbox(userId: string, applicationId: string) {
  if (process.env.OWNER_USER_ID && process.env.OWNER_USER_ID !== userId)
    throw new Error("This workspace is no longer authorized to send");
  // Refresh before taking the send lease: expired credentials cannot turn a safe queued item uncertain.
  const { token, account } = await accessToken(userId);
  const app = await db.application.findFirst({
    where: { id: applicationId, userId },
  });
  if (!app) throw new Error("Application not found");
  const resume = await db.resume.findFirst({
    where: { id: app.resumeId, userId, approved: true },
  });
  if (!resume) throw new Error("An approved resume is required");
  if (quality(app.subject, app.body).length || !app.claimConfirmed)
    throw new Error("Review content and confirm claims before sending");
  const raw = Buffer.from(
    mimeMessage({
      from: account.email,
      to: app.recipient,
      subject: app.subject,
      body: app.body,
      messageId: app.messageId,
      filename: resume.name,
      mime: resume.mime,
      content: Buffer.from(resume.content),
    }),
  ).toString("base64url");
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + "sending"}))`;
    const workspace = await tx.workspace.findUnique({ where: { id: userId } });
    if (workspace?.paused !== false)
      throw new Error(
        "Sending is paused. Resume reviewed sending in Automation.",
      );
    const currentResume = await tx.resume.findFirst({
      where: { id: app.resumeId, userId, approved: true },
    });
    if (!currentResume) throw new Error("Resume approval was revoked");
    if (!(await tx.gmailAccount.findUnique({ where: { userId } })))
      throw new Error("Gmail was disconnected");
    const contact = await tx.contact.findUnique({
      where: { userId_email: { userId, email: app.recipient } },
    });
    if (!contact || contact.suppressed)
      throw new Error("Recipient is missing or suppressed");
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    const used = await tx.application.count({
      where: {
        userId,
        OR: [
          { sentAt: { gte: day } },
          { status: { in: ["SENDING", "SEND_UNCERTAIN"] } },
        ],
      },
    });
    if (used >= workspace.dailyLimit)
      throw new Error("Conservative daily sending limit reached");
    const recent = new Date(Date.now() - 30 * 86400000);
    const duplicate = await tx.application.findFirst({
      where: {
        userId,
        id: { not: app.id },
        AND: [
          {
            OR: [
              { status: "SENT", sentAt: { gte: recent } },
              { status: { in: ["SENDING", "SEND_UNCERTAIN"] } },
            ],
          },
          {
            OR: [{ recipient: app.recipient }, { companyKey: app.companyKey }],
          },
        ],
      },
    });
    if (duplicate)
      throw new Error(
        "Recipient or company is inside the 30-day outreach cooldown",
      );
    const locked = await tx.outbox.updateMany({
      where: { applicationId, userId, status: "QUEUED" },
      data: {
        status: "SENDING",
        leaseAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (locked.count !== 1)
      throw new Error(
        "This application is already processing or was processed",
      );
    const changed = await tx.application.updateMany({
      where: { id: app.id, userId, status: "QUEUED" },
      data: { status: "SENDING", error: null },
    });
    if (changed.count !== 1) throw new Error("Application is no longer queued");
  });
  try {
    const result = await gmailRequest(token, "messages/send", {
      method: "POST",
      body: JSON.stringify({ raw }),
    });
    if (!result.id || !result.threadId)
      throw new Error("Missing Gmail acceptance confirmation");
    await db.$transaction([
      db.application.update({
        where: { id: app.id },
        data: {
          status: "SENT",
          gmailId: result.id,
          threadId: result.threadId,
          sentAt: new Date(),
        },
      }),
      db.outbox.update({ where: { applicationId }, data: { status: "SENT" } }),
      db.audit.create({
        data: {
          userId,
          resource: app.id,
          action: "GMAIL_ACCEPTED",
          detail: "Gmail accepted the message; delivery is not confirmed.",
        },
      }),
    ]);
    return {
      status: "SENT",
      message: "Gmail accepted your application. Delivery is not confirmed.",
    };
  } catch {
    await db.$transaction([
      db.application.update({
        where: { id: app.id },
        data: {
          status: "SEND_UNCERTAIN",
          error:
            "Gmail acceptance could not be confirmed. Check Sent mail before taking any further action. No automatic retry.",
        },
      }),
      db.outbox.update({
        where: { applicationId },
        data: { status: "SEND_UNCERTAIN" },
      }),
    ]);
    return {
      status: "SEND_UNCERTAIN",
      message:
        "The sending result is uncertain. Check Gmail Sent; SOL Ai will not retry automatically.",
    };
  }
}
