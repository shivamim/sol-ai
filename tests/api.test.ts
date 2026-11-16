import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
const session = vi.hoisted(() => ({ id: "test_sol_a" as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.id }),
}));
import { db } from "../src/lib/db";
import { POST, GET, DELETE } from "../src/app/api/[...path]/route";
import { decrypt, encrypt } from "../src/lib/security";
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite("Authenticated API vertical slice with mocked Gmail/AI", () => {
  const uid = "test_sol_a",
    other = "test_sol_b";
  beforeAll(async () => {
    await db.$connect();
  });
  beforeEach(async () => {
    vi.unstubAllGlobals();
    session.id = uid;
    delete process.env.OWNER_USER_ID;
    await db.workspace.deleteMany({ where: { id: { in: [uid, other] } } });
    await db.workspace.createMany({ data: [{ id: uid }, { id: other }] });
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    delete process.env.OWNER_USER_ID;
    await db.workspace.deleteMany({ where: { id: { in: [uid, other] } } });
    await db.$disconnect();
  });
  function post(path: string, data: unknown, origin = "http://localhost:3000") {
    return POST(
      new NextRequest(`http://localhost:3000/api/${path}`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(data),
      }),
      { params: Promise.resolve({ path: path.split("/") }) },
    );
  }
  function get(path: string) {
    return GET(new NextRequest(`http://localhost:3000/api/${path}`), {
      params: Promise.resolve({ path: path.split("/") }),
    });
  }
  const profile = {
    name: "Test Candidate",
    role: "Data Analyst",
    skills: ["SQL", "Python"],
    summary: "Confirmed summary",
    claims: "",
    signature: "Test Candidate",
    location: "",
  };
  it("rejects unauthenticated writes", async () => {
    session.id = null;
    expect((await post("profile", profile)).status).toBe(401);
  });
  it("rejects foreign origins before mutation", async () => {
    expect(
      (await post("profile", profile, "https://evil.example")).status,
    ).toBe(400);
    expect(
      (await db.workspace.findUnique({ where: { id: uid } }))?.profile,
    ).toEqual({});
  });
  it("enforces the personal owner allowlist", async () => {
    process.env.OWNER_USER_ID = other;
    expect((await get("state")).status).toBe(403);
  });
  it("does not return stored API keys", async () => {
    await db.provider.create({
      data: {
        userId: uid,
        kind: "groq",
        secret: encrypt("very-secret-provider-key"),
        model: "test-model",
      },
    });
    const state = await (await get("state")).text();
    expect(state).not.toContain("very-secret");
    expect(state).not.toContain('"secret"');
  });
  it("scopes private resume downloads and exports", async () => {
    const r = await db.resume.create({
      data: {
        userId: other,
        name: "private.txt",
        role: "Analyst",
        mime: "text/plain",
        content: Buffer.from("other-user-private"),
        text: "other-user-private",
        hash: "other-hash",
      },
    });
    expect((await get(`resumes/${r.id}`)).status).toBe(404);
    expect(await (await get("export")).text()).not.toContain(
      "other-user-private",
    );
  });
  it("imports atomically without sending or creating applications", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        throw new Error("Unexpected external request");
      }),
    );
    const r = await post("contacts", {
      permitted: true,
      rows: [
        { email: "valid@example.com", source: "User permitted" },
        { email: "bad", source: "User permitted" },
      ],
    });
    expect(r.status).toBe(400);
    expect(await db.contact.count({ where: { userId: uid } })).toBe(0);
    expect(await db.application.count({ where: { userId: uid } })).toBe(0);
    expect(calls).toBe(0);
  });
  it("runs profile → resume → draft → approval → Gmail acceptance", async () => {
    expect((await post("profile", profile)).status).toBe(200);
    const form = new FormData();
    form.set("role", "Data Analyst");
    form.set(
      "file",
      new File(["Confirmed candidate resume: SQL and Python"], "resume.txt", {
        type: "text/plain",
      }),
    );
    const uploaded = await POST(
      new NextRequest("http://localhost:3000/api/resumes", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
        body: form,
      }),
      { params: Promise.resolve({ path: ["resumes"] }) },
    );
    expect(uploaded.status).toBe(200);
    const resume = await db.resume.findFirstOrThrow({ where: { userId: uid } });
    expect(resume.approved).toBe(false);
    expect(
      (await post("resumes/approve", { id: resume.id, approved: true })).status,
    ).toBe(200);
    let sends = 0;
    const aiPayloads: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown, init?: RequestInit) => {
        if (String(url).includes("/models"))
          return new Response(JSON.stringify({ data: [{ id: "test-model" }] }));
        if (String(url).includes("chat/completions")) {
          aiPayloads.push(String(init?.body));
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      subject: "Expression of interest in data analytics",
                      evidenceIds: [
                        ...new Set(
                          String(init?.body).match(/E[a-f0-9]{12}/g) || [],
                        ),
                      ].slice(0, 1),
                      body: "I am interested in suitable data analyst opportunities. My confirmed skills include SQL and Python, and I would welcome the chance to discuss how I could contribute to your team. My resume is attached for your review. Thank you for considering my introduction.",
                    }),
                  },
                },
              ],
              usage: { total_tokens: 150 },
            }),
          );
        }
        if (String(url).includes("oauth2.googleapis.com"))
          return new Response(JSON.stringify({ access_token: "mock-access" }));
        if (String(url).includes("messages/send")) {
          sends++;
          const raw = JSON.parse(String(init?.body)).raw;
          expect(Buffer.from(raw, "base64url").toString()).toContain(
            "Content-Disposition: attachment",
          );
          return new Response(
            JSON.stringify({ id: "mock-gmail-id", threadId: "mock-thread-id" }),
          );
        }
        throw new Error("Unexpected external request");
      }),
    );
    expect(
      (
        await post("providers", {
          kind: "groq",
          key: "test-private-provider-key",
          model: "test-model",
          freeConfirmed: true,
          dailyRequests: 30,
          dailyTokens: 30000,
          maxOutput: 512,
        })
      ).status,
    ).toBe(200);
    const stored = await db.provider.findUniqueOrThrow({
      where: { userId_kind: { userId: uid, kind: "groq" } },
    });
    expect(decrypt(stored.secret)).toBe("test-private-provider-key");
    const generated = await post("applications/generate", {
      email: "recruiter@example.com",
      company: "Private Company",
      role: "Data Analyst",
      description: "Private job notes from confidential employer",
      provider: "groq",
      permitted: true,
    });
    expect(generated.status).toBe(200);
    const { application } = await generated.json();
    expect(application.intelligence.version).toBe("bounded-rag-agent-v1");
    expect(application.intelligence.retrieval.evidence.length).toBeGreaterThan(
      0,
    );
    expect(application.intelligence.citations.length).toBeGreaterThan(0);
    expect(application.intelligence.steps.at(-1).status).toBe("waiting");
    expect(aiPayloads.join(" ")).not.toMatch(
      /Test Candidate|recruiter@example.com|Private Company|confidential employer/,
    );
    expect(
      (await post("applications/send", { id: application.id })).status,
    ).toBe(400);
    expect(sends).toBe(0);
    expect(
      (
        await post("applications/approve", {
          id: application.id,
          claimsConfirmed: true,
        })
      ).status,
    ).toBe(200);
    await db.gmailAccount.create({
      data: {
        userId: uid,
        email: "candidate@example.com",
        refreshToken: encrypt("mock-refresh"),
      },
    });
    expect(
      (await post("automation", { paused: false, dailyLimit: 8 })).status,
    ).toBe(200);
    const result = await post("applications/send", { id: application.id });
    expect(result.status).toBe(200);
    expect((await result.json()).status).toBe("SENT");
    expect(sends).toBe(1);
    expect(
      (await post("applications/send", { id: application.id })).status,
    ).toBe(400);
    expect(sends).toBe(1);
    const sent = await db.application.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(sent.gmailId).toBe("mock-gmail-id");
    expect(sent.resumeId).toBe(resume.id);
  });
  it("requires a matching cron secret", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    expect((await get("worker")).status).toBe(401);
    delete process.env.CRON_SECRET;
  });
  it("deletes only the requesting user's application data", async () => {
    await db.contact.createMany({
      data: [
        { userId: uid, email: "a@example.com", source: "test" },
        { userId: other, email: "b@example.com", source: "test" },
      ],
    });
    const r = await DELETE(
      new NextRequest("http://localhost:3000/api/account", {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ confirm: "DELETE" }),
      }),
      { params: Promise.resolve({ path: ["account"] }) },
    );
    expect(r.status).toBe(200);
    expect(await db.contact.count({ where: { userId: uid } })).toBe(0);
    expect(await db.contact.count({ where: { userId: other } })).toBe(1);
  });
});
