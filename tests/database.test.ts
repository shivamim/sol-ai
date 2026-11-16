import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { db } from "../src/lib/db";
import { encrypt } from "../src/lib/security";
import { processOutbox } from "../src/lib/gmail";
import { generateDraft } from "../src/lib/ai";
const enabled = !!process.env.TEST_DATABASE_URL;
if (enabled) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const suite = enabled ? describe : describe.skip;
suite("PostgreSQL workflow with mocked external APIs (no real email)", () => {
  const uid = "test_sol_a",
    other = "test_sol_b";
  beforeAll(async () => {
    await db.$connect();
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.workspace.deleteMany({ where: { id: { in: [uid, other] } } });
    await db.workspace.createMany({
      data: [
        { id: uid, paused: false },
        { id: other, paused: false },
      ],
    });
    await db.contact.create({
      data: {
        userId: uid,
        email: "recruiter@example.com",
        company: "Example",
        source: "Permitted test",
      },
    });
    await db.gmailAccount.create({
      data: {
        userId: uid,
        email: "candidate@example.com",
        refreshToken: encrypt("test-token"),
      },
    });
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await db.workspace.deleteMany({ where: { id: { in: [uid, other] } } });
    await db.$disconnect();
  });
  async function queued() {
    const resume = await db.resume.create({
      data: {
        userId: uid,
        name: "resume.txt",
        role: "Data Analyst",
        mime: "text/plain",
        content: Buffer.from("User confirmed resume"),
        text: "User confirmed resume",
        approved: true,
        hash: crypto.randomUUID(),
      },
    });
    const app = await db.application.create({
      data: {
        userId: uid,
        recipient: "recruiter@example.com",
        company: "Example",
        companyKey: "example",
        role: "Data Analyst",
        resumeId: resume.id,
        subject: "Expression of interest",
        body: "I would like to introduce myself and ask about suitable opportunities. My resume is attached for your review. Thank you for your time.",
        provider: "groq",
        model: "discovered-test-model",
        status: "QUEUED",
        claimConfirmed: true,
        approvedAt: new Date(),
        messageId: crypto.randomUUID() + "@example.com",
      },
    });
    await db.outbox.create({ data: { userId: uid, applicationId: app.id } });
    return app;
  }
  function mockSend(mode: "success" | "uncertain" | "expired" = "success") {
    let sends = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        if (String(url).includes("oauth2.googleapis.com"))
          return new Response(
            JSON.stringify(
              mode === "expired"
                ? { error: "invalid_grant" }
                : { access_token: "test-access" },
            ),
            { status: mode === "expired" ? 400 : 200 },
          );
        sends++;
        if (mode === "uncertain")
          throw new Error("network failure after acceptance");
        return new Response(
          JSON.stringify({ id: "gmail-message", threadId: "gmail-thread" }),
        );
      }),
    );
    return () => sends;
  }
  it("enforces a same-tenant foreign key for outbox records", async () => {
    const app = await queued();
    await expect(
      db.outbox.create({
        data: { userId: other, applicationId: app.id + "missing" },
      }),
    ).rejects.toThrow();
  });
  it("isolates application reads by user", async () => {
    const app = await queued();
    expect(
      await db.application.findFirst({ where: { id: app.id, userId: other } }),
    ).toBeNull();
  });
  it("allows only one concurrent sender", async () => {
    const app = await queued(),
      sends = mockSend();
    const result = await Promise.allSettled([
      processOutbox(uid, app.id),
      processOutbox(uid, app.id),
    ]);
    expect(sends()).toBe(1);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await db.application.findUnique({ where: { id: app.id } }))?.status,
    ).toBe("SENT");
  });
  it("preserves uncertain sends and never retries", async () => {
    const app = await queued(),
      sends = mockSend("uncertain");
    expect((await processOutbox(uid, app.id)).status).toBe("SEND_UNCERTAIN");
    await expect(processOutbox(uid, app.id)).rejects.toThrow();
    expect(sends()).toBe(1);
  });
  it("retains queued work on expired OAuth tokens", async () => {
    const app = await queued(),
      sends = mockSend("expired");
    await expect(processOutbox(uid, app.id)).rejects.toThrow(
      /authorization expired/,
    );
    expect(
      (await db.outbox.findUnique({ where: { applicationId: app.id } }))
        ?.status,
    ).toBe("QUEUED");
    expect(sends()).toBe(0);
  });
  it("checks the server pause before sending", async () => {
    const app = await queued(),
      sends = mockSend();
    await db.workspace.update({ where: { id: uid }, data: { paused: true } });
    await expect(processOutbox(uid, app.id)).rejects.toThrow(/paused/);
    expect(sends()).toBe(0);
  });
  it("honors suppression", async () => {
    const app = await queued(),
      sends = mockSend();
    await db.contact.updateMany({
      where: { userId: uid },
      data: { suppressed: true },
    });
    await expect(processOutbox(uid, app.id)).rejects.toThrow(/suppressed/);
    expect(sends()).toBe(0);
  });
  it("blocks company cooldown", async () => {
    const first = await queued();
    const sends = mockSend();
    await processOutbox(uid, first.id);
    const second = await queued();
    await expect(processOutbox(uid, second.id)).rejects.toThrow(/cooldown/);
    expect(sends()).toBe(1);
  });
  it("reserves AI request budgets atomically", async () => {
    await db.provider.create({
      data: {
        userId: uid,
        kind: "groq",
        secret: encrypt("test-key"),
        model: "test-model",
        freeConfirmed: true,
        dailyRequests: 1,
      },
    });
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    subject: "Expression of interest",
                    body: "I would like to introduce myself and ask about suitable opportunities in data analytics. My skills include SQL and Python. I have attached my resume for review. Thank you for your time.",
                  }),
                },
              },
            ],
            usage: { total_tokens: 120 },
          }),
        );
      }),
    );
    const results = await Promise.allSettled([
      generateDraft(uid, "groq", ["SQL"], "Data Analyst"),
      generateDraft(uid, "groq", ["SQL"], "Data Analyst"),
    ]);
    expect(calls).toBe(1);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});
