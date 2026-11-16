import { auth } from "@clerk/nextjs/server";
import { db } from "./db";
import { NextResponse } from "next/server";
import { z } from "zod";
export async function user() {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");
  if (process.env.OWNER_USER_ID && process.env.OWNER_USER_ID !== userId)
    throw new Error("FORBIDDEN");
  await db.workspace.upsert({
    where: { id: userId },
    create: { id: userId },
    update: {},
  });
  return userId;
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      400,
    );
  const msg = error instanceof Error ? error.message : "Request failed";
  if (msg === "UNAUTHENTICATED")
    return json({ error: "Sign in to continue" }, 401);
  if (msg === "FORBIDDEN")
    return json({ error: "This is a private personal deployment" }, 403);
  if (/prisma|database|Invalid .*invocation|connect.*server/i.test(msg))
    return json(
      {
        error: "Database unavailable. Check DATABASE_URL and apply migrations.",
      },
      503,
    );
  return json({ error: msg.slice(0, 350) }, 400);
}
export async function audit(
  userId: string,
  action: string,
  resource: string,
  detail = "",
) {
  return db.audit.create({ data: { userId, action, resource, detail } });
}
export async function rateLimit(userId: string, action: string, max = 30) {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + action}))`;
    const count = await tx.audit.count({
      where: {
        userId,
        action,
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });
    if (count >= max)
      throw new Error("Too many requests. Please wait a minute.");
    await tx.audit.create({ data: { userId, action, resource: "rate-limit" } });
  });
}
