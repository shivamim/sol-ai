"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  LayoutDashboard,
  Sparkles,
  BriefcaseBusiness,
  Users,
  FileText,
  Mail,
  SlidersHorizontal,
  Plug,
  Zap,
  Check,
  ChevronRight,
  Search,
  Menu,
  X,
  Pause,
  ShieldCheck,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Send,
  ExternalLink,
  Sun,
  CircleAlert,
  Activity,
} from "lucide-react";
import { normalizeEmails, parseContacts, matchSkills } from "@/lib/domain";
type Resume = {
  id: string;
  name: string;
  role: string;
  approved: boolean;
  text: string;
};
type Contact = {
  id?: string;
  email: string;
  name: string;
  company: string;
  title: string;
  source: string;
  suppressed?: boolean;
};
type Application = {
  id: string;
  recipient: string;
  company: string;
  role: string;
  subject: string;
  body: string;
  status: string;
  outcome: string;
  resumeId: string;
  provider: string;
  model: string;
  error?: string;
  createdAt: string;
  jobUrl: string;
  description: string;
};
type Profile = {
  name: string;
  role: string;
  skills: string[];
  summary: string;
  signature: string;
  claims: string;
  location: string;
};
type Provider = {
  kind: string;
  model: string;
  enabled: boolean;
  freeConfirmed: boolean;
  dailyRequests: number;
  dailyTokens: number;
};
type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
};
type State = {
  workspace: { profile: Partial<Profile>; paused: boolean; dailyLimit: number };
  resumes: Resume[];
  contacts: Contact[];
  providers: Provider[];
  gmail: null | { email: string; readEnabled: boolean; syncedAt: string };
  applications: Application[];
  activity: { id: string; action: string; createdAt: string; detail: string }[];
  replies: {
    id: string;
    category: string;
    snippet: string;
    applicationId: string;
  }[];
  jobs: Job[];
  usage: { tokens: number; status: string; provider: string }[];
};
const navigation = [
  {
    group: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "apply", label: "Quick Apply", icon: Sparkles },
      { id: "applications", label: "Applications", icon: BriefcaseBusiness },
      { id: "jobs", label: "Job Discovery", icon: Search },
      { id: "contacts", label: "Recruiter Contacts", icon: Users },
      { id: "inbox", label: "Inbox", icon: Mail },
      { id: "resumes", label: "Resume Library", icon: FileText },
    ],
  },
  {
    group: "CONTROLS",
    items: [
      { id: "automation", label: "Automation", icon: Zap },
      { id: "providers", label: "AI Providers", icon: SlidersHorizontal },
      { id: "integrations", label: "Integrations", icon: Plug },
      { id: "profile", label: "Profile & Settings", icon: ShieldCheck },
    ],
  },
];
const titles: Record<string, [string, string]> = {
  overview: [
    "A clearer path to your next chapter.",
    "Your search, thoughtfully organized. Let's make the next move count.",
  ],
  apply: [
    "Make a thoughtful first impression.",
    "One relevant contact. One honest application. Always reviewed by you.",
  ],
  applications: [
    "Every opportunity, in perspective.",
    "Track your drafts, reviewed applications and real Gmail results.",
  ],
  jobs: [
    "Find your next possibility.",
    "Discover real postings from public Greenhouse and Lever boards.",
  ],
  contacts: [
    "Better connections start here.",
    "Import permitted recruiter contacts. Review first, reach out thoughtfully.",
  ],
  inbox: [
    "Keep the conversation moving.",
    "Relevant replies, classified locally. Your private emails stay out of AI prompts.",
  ],
  resumes: [
    "Your experience, ready to share.",
    "Private documents. Confirmed facts. The right resume for the right role.",
  ],
  automation: [
    "You set the pace.",
    "Control reviewed sending and keep a clear record of every action.",
  ],
  providers: [
    "Intelligence on your terms.",
    "Bring your own Gemini or Groq key. Keep costs and privacy in view.",
  ],
  integrations: [
    "Connect your workflow.",
    "Real integrations, clear permissions and credentials encrypted at rest.",
  ],
  profile: [
    "The story only you can tell.",
    "Confirm the facts behind every application. Nothing is invented.",
  ],
};
async function request(path: string, data?: unknown, method = "POST") {
  const result = await fetch("/api/" + path, {
    method,
    headers:
      data instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
  });
  const value = await result.json();
  if (!result.ok) throw new Error(value.error || "Request failed");
  return value;
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <i />
      {children}
    </span>
  );
}
function Empty({
  icon: Icon = BriefcaseBusiness,
  title,
  detail,
  action,
}: {
  icon?: typeof BriefcaseBusiness;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Form({
  onSubmit,
  children,
}: {
  onSubmit: (data: FormData) => Promise<void>;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit(new FormData(e.currentTarget));
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>{children}</fieldset>
    </form>
  );
}
export default function Workspace({ configured }: { configured: boolean }) {
  return configured ? <Authenticated /> : <Shell configured={false} />;
}
function Authenticated() {
  const { isLoaded, isSignedIn, user } = useUser();
  return (
    <Shell
      key={user?.id || "anonymous"}
      configured
      signedIn={isLoaded && isSignedIn}
      name={user?.firstName || undefined}
    />
  );
}
function Shell({
  configured,
  signedIn = false,
  name,
}: {
  configured: boolean;
  signedIn?: boolean;
  name?: string;
}) {
  const [view, setView] = useState("overview"),
    [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Application | null>(null),
    [theme, setTheme] = useState("light");
  async function refresh() {
    setLoading(true);
    try {
      const data = await request("state", undefined, "GET");
      setState(data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (signedIn) {
      let active = true;
      request("state", undefined, "GET")
        .then((data) => {
          if (active) setState(data);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
      return () => {
        active = false;
      };
    }
  }, [signedIn]);
  useEffect(() => {
    const apply = () => {
      const v = new URLSearchParams(window.location.search).get("view");
      if (v && titles[v]) setView(v);
    };
    const frame = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(frame);
  }, []);
  async function act(path: string, data?: unknown, method = "POST") {
    setError("");
    setMessage("");
    try {
      if (!signedIn)
        throw new Error(
          configured
            ? "Sign in to use your private workspace"
            : "Configure Clerk and your database to activate your workspace",
        );
      const result = await request(path, data, method);
      setMessage(result.message || "Saved");
      await refresh();
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }
  function go(id: string) {
    setView(id);
    setMobile(false);
    setSearch("");
  }
  const apps = state?.applications || [],
    profile = state?.workspace.profile || {},
    resumes = state?.resumes || [],
    pending = apps.filter((a) => a.status === "REVIEW_REQUIRED"),
    sent = apps.filter((a) => a.status === "SENT"),
    interviews = apps.filter((a) => a.outcome === "INTERVIEW"),
    replied = apps.filter((a) => a.outcome !== "PENDING"),
    attention = apps.filter((a) => a.error || a.status === "SEND_UNCERTAIN");
  const setup = [
    {
      label: "Confirm your professional profile",
      detail: "The facts behind every application",
      done: !!profile.name,
      view: "profile",
      icon: ShieldCheck,
    },
    {
      label: "Add an approved resume",
      detail: "Securely stored, always yours",
      done: resumes.some((r) => r.approved),
      view: "resumes",
      icon: FileText,
    },
    {
      label: "Connect your intelligence",
      detail: "Your Gemini or Groq API key",
      done: !!state?.providers.some((p) => p.enabled),
      view: "providers",
      icon: Sparkles,
    },
    {
      label: "Connect your Gmail",
      detail: "Send from your own address",
      done: !!state?.gmail,
      view: "integrations",
      icon: Mail,
    },
  ];
  const progress = setup.filter((s) => s.done).length;
  const counts: Record<string, number> = {
    applications: apps.length,
    contacts: state?.contacts.length || 0,
    inbox: state?.replies.length || 0,
  };
  return (
    <div className={`app ${theme}`}>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <Link className="brand" href="/" aria-label="SOL Ai home">
          <span className="brand-mark">
            <Sun size={25} />
          </span>
          <b>
            SOL<span> Ai</span>
          </b>
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar">{(name || "P")[0]}</span>
          <div>
            Personal workspace<small>YOUR NEXT CHAPTER</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <nav>
          {navigation.map((group) => (
            <div key={group.group}>
              <p className="nav-group">{group.group}</p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={view === item.id ? "nav-item active" : "nav-item"}
                  onClick={() => go(item.id)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {counts[item.id] > 0 && <small>{counts[item.id]}</small>}
                  {item.id === "apply" && <span className="shortcut">↗</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <p>
              Private by design
              <small>Your career. Your data. Your control.</small>
            </p>
          </div>
          <button className="user-row" onClick={() => go("profile")}>
            <span className="user-avatar">{(name || "Y")[0]}</span>
            <div>
              {name || "Your workspace"}
              <small>Personal account</small>
            </div>
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>
              {
                navigation.flatMap((g) => g.items).find((i) => i.id === view)
                  ?.label
              }
            </b>
          </div>
          <div className="top-actions">
            <button
              className="theme-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle color theme"
            >
              <Sun size={17} />
            </button>
            <span className="personal-pill">
              <span />
              Personal workspace
            </span>
            {configured ? (
              signedIn ? (
                <UserButton />
              ) : (
                <SignInButton mode="modal">
                  <button className="button small">
                    Sign in <ArrowUpRight size={14} />
                  </button>
                </SignInButton>
              )
            ) : (
              <span className="setup-tag">Setup required</span>
            )}
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {view === "overview"
                  ? "A LITTLE FOCUS. A LOT OF POSSIBILITY."
                  : "YOUR PERSONAL CAREER WORKSPACE"}
              </div>
              <h1>{titles[view][0]}</h1>
              <p>{titles[view][1]}</p>
            </div>
            {view === "overview" ? (
              <button className="button" onClick={() => go("apply")}>
                <Plus size={17} />
                Quick Apply
              </button>
            ) : (
              <button
                className="button secondary small"
                onClick={refresh}
                disabled={!signedIn || loading}
              >
                <RefreshCw size={14} className={loading ? "spin" : ""} />
                Refresh
              </button>
            )}
          </div>
          {!signedIn && (
            <div className="notice">
              <ShieldCheck size={18} />
              <span>
                {configured
                  ? "Sign in to activate your private workspace. All counts below start empty."
                  : "Connect Clerk, Neon and your environment variables to activate SOL Ai. No demo data is shown."}
              </span>
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              <CircleAlert size={19} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {message && (
            <div className="notice success" role="status">
              <Check size={18} />
              <span>{message}</span>
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {view === "overview" && (
            <>
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="hero-tag">
                    <span />
                    INTENTIONAL APPLICATIONS. REAL POSSIBILITIES.
                  </span>
                  <h2>
                    Your next move,
                    <br />
                    with a little more clarity.
                  </h2>
                  <p>
                    Less busywork. More meaningful connections.
                    <br />
                    Build a job search that works around your life.
                  </p>
                  <button
                    onClick={() =>
                      go(
                        progress < 4
                          ? setup.find((s) => !s.done)!.view
                          : "apply",
                      )
                    }
                    className="button dark"
                  >
                    {progress < 4
                      ? "Set up your workspace"
                      : "Prepare an application"}
                    <ArrowRight size={16} />
                  </button>
                  <span className="hero-foot">
                    <ShieldCheck size={13} />
                    You stay in control of every application.
                  </span>
                </div>
                <div className="orbit-art" aria-hidden="true">
                  <div className="orbit outer" />
                  <div className="orbit middle" />
                  <div className="orbit inner" />
                  <div className="art-core">
                    <Sun size={48} />
                  </div>
                  <div className="floating note-one">
                    <span className="green-icon">
                      <Check size={15} />
                    </span>
                    <div>
                      Thoughtfully prepared
                      <small>Grounded in your experience</small>
                    </div>
                  </div>
                  <div className="floating note-two">
                    <span className="purple-icon">
                      <Sparkles size={17} />
                    </span>
                    <div>
                      A more focused search
                      <small>One good opportunity at a time</small>
                    </div>
                  </div>
                  <i className="orbit-dot dot-one" />
                  <i className="orbit-dot dot-two" />
                  <span className="art-caption">
                    A LITTLE HELP. ALL YOUR POTENTIAL.
                  </span>
                </div>
              </section>
              <section className="stats">
                {[
                  {
                    label: "Applications prepared",
                    value: apps.length,
                    icon: FileText,
                    sub: `${pending.length} awaiting your review`,
                    color: "purple",
                  },
                  {
                    label: "Accepted by Gmail",
                    value: sent.length,
                    icon: Send,
                    sub: "Delivery is not confirmed",
                    color: "blue",
                  },
                  {
                    label: "Recruiter responses",
                    value: replied.length,
                    icon: Mail,
                    sub: "Across your connected threads",
                    color: "green",
                  },
                  {
                    label: "Interview invitations",
                    value: interviews.length,
                    icon: BriefcaseBusiness,
                    sub: "Your next conversations",
                    color: "orange",
                  },
                ].map((s) => (
                  <div className="stat" key={s.label}>
                    <div>
                      <span>{s.label}</span>
                      <span className={`stat-icon ${s.color}`}>
                        <s.icon size={17} />
                      </span>
                    </div>
                    <strong>
                      {s.value}
                      <span>—</span>
                    </strong>
                    <small>{s.sub}</small>
                  </div>
                ))}
              </section>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        Your launch checklist{" "}
                        <span className="count">{progress}/4</span>
                      </h2>
                      <p>A few small steps. A strong foundation.</p>
                    </div>
                    <span
                      className="progress-circle"
                      style={{
                        background: `conic-gradient(var(--accent) ${progress * 25}%, var(--border) 0)`,
                      }}
                    >
                      <span>{progress * 25}%</span>
                    </span>
                  </div>
                  <div className="checklist">
                    {setup.map((s, i) => (
                      <button
                        key={s.view}
                        onClick={() => go(s.view)}
                        className="checklist-row"
                      >
                        <span className={s.done ? "step complete" : "step"}>
                          {s.done ? <Check size={15} /> : i + 1}
                        </span>
                        <div>
                          <b>{s.label}</b>
                          <small>{s.detail}</small>
                        </div>
                        {s.done ? (
                          <Badge tone="green">Complete</Badge>
                        ) : (
                          <ChevronRight size={17} />
                        )}
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Needs your attention</h2>
                      <p>The important things, in one place.</p>
                    </div>
                    <span className="soft-icon">
                      <Activity size={17} />
                    </span>
                  </div>
                  {attention.length ? (
                    <div className="compact-list">
                      {attention.slice(0, 4).map((a) => (
                        <button key={a.id} onClick={() => setSelected(a)}>
                          <CircleAlert size={16} />
                          <div>
                            <b>{a.company || a.recipient}</b>
                            <small>{a.error}</small>
                          </div>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={Check}
                      title="A little room to breathe."
                      detail="Exceptions and blocked applications will appear here. You’re all clear for now."
                    />
                  )}
                  <div className="panel-footer">
                    <span className="status-dot" />
                    {state?.workspace.paused !== false
                      ? "Sending is paused"
                      : "Reviewed sending enabled"}
                    <button onClick={() => go("automation")}>
                      Manage <ArrowUpRight size={13} />
                    </button>
                  </div>
                </section>
              </div>
              <section className="panel recent">
                <div className="panel-heading">
                  <div>
                    <h2>Your application journey</h2>
                    <p>
                      Every first step, follow-through and new conversation.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => go("applications")}
                  >
                    View all applications <ArrowRight size={15} />
                  </button>
                </div>
                {apps.length ? (
                  <ApplicationTable
                    apps={apps.slice(0, 5)}
                    select={setSelected}
                  />
                ) : (
                  <div className="journey-empty">
                    <span className="journey-line" />
                    <span className="journey-symbol">
                      <BriefcaseBusiness size={23} />
                    </span>
                    <div>
                      <h3>Great things begin with a first application.</h3>
                      <p>
                        Prepare a thoughtful introduction and start your next
                        chapter.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => go("apply")}
                    >
                      Create your first application <ArrowUpRight size={15} />
                    </button>
                  </div>
                )}
              </section>
              <div className="bottom-note">
                <Sun size={14} />
                <span>
                  Progress over pressure. One thoughtful application at a time.
                </span>
                <span>SOL Ai · Your personal career workspace</span>
              </div>
            </>
          )}
          {view === "profile" && (
            <div className="two-col">
              <section className="panel padded">
                <h2>Confirmed professional profile</h2>
                <p className="muted">
                  Only enter skills, qualifications and achievements you can
                  support.
                </p>
                <Form
                  key={JSON.stringify(profile)}
                  onSubmit={async (f) => {
                    await act("profile", {
                      name: f.get("name"),
                      role: f.get("role"),
                      skills: String(f.get("skills"))
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                      summary: f.get("summary"),
                      claims: f.get("claims"),
                      signature: f.get("signature"),
                      location: f.get("location"),
                    });
                  }}
                >
                  <Field label="Full name">
                    <input name="name" required defaultValue={profile.name} />
                  </Field>
                  <Field label="Target role">
                    <input
                      name="role"
                      required
                      defaultValue={profile.role}
                      placeholder="Data Analyst"
                    />
                  </Field>
                  <Field label="Confirmed skills, separated by commas">
                    <input
                      name="skills"
                      required
                      defaultValue={profile.skills?.join(", ")}
                      placeholder="Python, SQL, Power BI"
                    />
                  </Field>
                  <Field label="Professional summary">
                    <textarea name="summary" defaultValue={profile.summary} />
                  </Field>
                  <Field label="Verified achievements and experience">
                    <textarea name="claims" defaultValue={profile.claims} />
                  </Field>
                  <Field label="Location preference">
                    <input name="location" defaultValue={profile.location} />
                  </Field>
                  <Field label="Email signature">
                    <textarea
                      name="signature"
                      defaultValue={profile.signature}
                    />
                  </Field>
                  <button className="button" type="submit">
                    <Check size={16} />
                    Confirm & save profile
                  </button>
                </Form>
              </section>
              <div>
                <section className="panel padded">
                  <ShieldCheck className="accent" size={25} />
                  <h2>Your facts are the foundation.</h2>
                  <p className="muted">
                    Your profile stays private. The current writing workflow
                    sends only approved role and skill categories to your
                    selected AI provider. Review every generated statement
                    before approval.
                  </p>
                </section>
                <section className="panel padded space-top">
                  <h2>Data controls</h2>
                  <p className="muted">
                    Export your profile, contacts and applications. Resume files
                    can be downloaded from the library.
                  </p>
                  <a className="button secondary" href="/api/export" download>
                    <Download size={16} />
                    Export data
                  </a>
                  <hr />
                  <Form
                    onSubmit={async (f) => {
                      await act(
                        "account",
                        { confirm: f.get("confirm") },
                        "DELETE",
                      );
                    }}
                  >
                    <Field label="Delete all application data (type DELETE)">
                      <input name="confirm" required pattern="DELETE" />
                    </Field>
                    <button className="button danger">
                      Delete my application data
                    </button>
                  </Form>
                </section>
              </div>
            </div>
          )}
          {view === "apply" && (
            <div className="two-col">
              <section className="panel padded">
                <div className="section-kicker">
                  <Sparkles size={17} />A THOUGHTFUL INTRODUCTION
                </div>
                <h2>Start with a connection.</h2>
                <p className="muted">
                  Prepare an honest expression of interest. Opportunity notes
                  stay private for your review; the AI writer uses confirmed
                  skill categories only.
                </p>
                <Form
                  key={profile.role}
                  onSubmit={async (f) => {
                    const r = await act("applications/generate", {
                      email: f.get("email"),
                      company: f.get("company"),
                      role: f.get("role"),
                      description: f.get("description"),
                      jobUrl: f.get("jobUrl"),
                      provider: f.get("provider"),
                      resumeId: String(f.get("resumeId")) || undefined,
                      permitted: f.get("permitted") === "on",
                    });
                    if (r) setSelected(r.application);
                  }}
                >
                  <Field label="Recruiter email">
                    <input
                      required
                      type="email"
                      name="email"
                      placeholder="recruiter@company.com"
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Company (optional)">
                      <input name="company" placeholder="Company name" />
                    </Field>
                    <Field label="Target role">
                      <input
                        name="role"
                        required
                        defaultValue={profile.role}
                        placeholder="Data Analyst"
                      />
                    </Field>
                  </div>
                  <Field label="Opportunity notes / pasted job description (optional)">
                    <textarea
                      name="description"
                      rows={5}
                      placeholder="Private context for your review; never sent to the AI writer."
                    />
                  </Field>
                  <Field label="Official job URL (optional)">
                    <input name="jobUrl" type="url" placeholder="https://..." />
                  </Field>
                  <div className="form-grid">
                    <Field label="Approved resume">
                      <select name="resumeId">
                        <option value="">Choose by target role</option>
                        {resumes
                          .filter((r) => r.approved)
                          .map((r) => (
                            <option value={r.id} key={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="AI provider">
                      <select name="provider">
                        <option value="groq">Groq</option>
                        <option value="gemini">Gemini</option>
                      </select>
                    </Field>
                  </div>
                  <label className="check-label">
                    <input name="permitted" type="checkbox" required />I confirm
                    this is an appropriate professional contact and I am
                    permitted to contact them.
                  </label>
                  <button className="button">
                    <Sparkles size={17} />
                    Prepare application <ArrowRight size={15} />
                  </button>
                </Form>
              </section>
              <div>
                <section className="panel padded">
                  <div className="soft-icon purple">
                    <FileText size={22} />
                  </div>
                  <h2>A better kind of application.</h2>
                  <ul className="benefits">
                    <li>
                      <Check size={15} />
                      Grounded in your confirmed skills
                    </li>
                    <li>
                      <Check size={15} />
                      Your approved resume, attached
                    </li>
                    <li>
                      <Check size={15} />
                      Editable before you approve
                    </li>
                    <li>
                      <Check size={15} />
                      No invented vacancies or qualifications
                    </li>
                  </ul>
                  <p className="fine">
                    AI can make mistakes. Your review confirms the facts and
                    suitability of every application.
                  </p>
                </section>
                <section className="panel padded space-top">
                  <h2>Working with a list?</h2>
                  <p className="muted">
                    Import a permitted Apollo-style CSV, spreadsheet or pasted
                    email list. Contacts are never sent an email on import.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => go("contacts")}
                  >
                    Import recruiter contacts <ArrowUpRight size={15} />
                  </button>
                </section>
              </div>
            </div>
          )}
          {view === "applications" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Application tracker{" "}
                    <span className="count">{apps.length}</span>
                  </h2>
                  <p>
                    Gmail acceptance and recruiter outcomes are tracked
                    separately.
                  </p>
                </div>
                <div className="search-box">
                  <Search size={15} />
                  <input
                    aria-label="Search applications"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search company, role, status…"
                  />
                </div>
              </div>
              {apps.length ? (
                <ApplicationTable
                  apps={apps.filter((a) =>
                    [a.company, a.recipient, a.role, a.status, a.outcome]
                      .join(" ")
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )}
                  select={setSelected}
                />
              ) : (
                <Empty
                  title="Your story starts with one application."
                  detail="Prepared applications will appear here, with their real status and content."
                  action={
                    <button className="button" onClick={() => go("apply")}>
                      <Plus size={15} />
                      Prepare application
                    </button>
                  }
                />
              )}
            </section>
          )}
          {view === "contacts" && (
            <Contacts contacts={state?.contacts || []} act={act} />
          )}
          {view === "resumes" && (
            <div className="two-col">
              <section className="panel padded">
                <h2>Your private resume library</h2>
                <p className="muted">
                  PDF, DOCX or TXT up to 4 MB. Parsed on the server without
                  sending the file to AI. Uploaded versions are immutable.
                </p>
                <Form
                  onSubmit={async (f) => {
                    await act("resumes", f);
                  }}
                >
                  <Field label="Target role">
                    <input
                      name="role"
                      required
                      placeholder="Data Analyst"
                      defaultValue={profile.role}
                    />
                  </Field>
                  <Field label="Resume file">
                    <input
                      type="file"
                      name="file"
                      required
                      accept=".pdf,.docx,.txt"
                    />
                  </Field>
                  <button className="button">
                    <Upload size={16} />
                    Upload private resume
                  </button>
                </Form>
              </section>
              <div>
                {resumes.length ? (
                  resumes.map((r) => (
                    <section className="panel padded resume-card" key={r.id}>
                      <div className="row-between">
                        <FileText className="accent" size={23} />
                        <Badge tone={r.approved ? "green" : "orange"}>
                          {r.approved ? "Approved" : "Needs review"}
                        </Badge>
                      </div>
                      <h3>{r.name}</h3>
                      <p className="muted">{r.role}</p>
                      <details>
                        <summary>Review extracted text</summary>
                        <pre className="resume-text">{r.text}</pre>
                      </details>
                      <div className="button-row">
                        <button
                          className="button secondary small"
                          onClick={() =>
                            act("resumes/approve", {
                              id: r.id,
                              approved: !r.approved,
                            })
                          }
                        >
                          <Check size={14} />
                          {r.approved
                            ? "Revoke approval"
                            : "Approve facts & resume"}
                        </button>
                        <a
                          className="icon-button"
                          aria-label="Download resume"
                          href={`/api/resumes/${r.id}`}
                        >
                          <Download size={17} />
                        </a>
                        <button
                          className="icon-button danger-text"
                          aria-label="Delete resume"
                          onClick={() => act("resumes", { id: r.id }, "DELETE")}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </section>
                  ))
                ) : (
                  <section className="panel">
                    <Empty
                      icon={FileText}
                      title="Your experience belongs here."
                      detail="Upload a resume, review the extracted text and approve the facts before it can be attached."
                    />
                  </section>
                )}
              </div>
            </div>
          )}
          {view === "providers" && (
            <Providers
              providers={state?.providers || []}
              usage={state?.usage || []}
              act={act}
            />
          )}
          {view === "integrations" && (
            <div className="two-col">
              <section className="panel padded">
                <div className="row-between">
                  <span className="integration-logo">
                    <Mail size={27} />
                  </span>
                  <Badge tone={state?.gmail ? "green" : "neutral"}>
                    {state?.gmail ? "Connected" : "Not connected"}
                  </Badge>
                </div>
                <h2>Gmail</h2>
                <p className="muted">
                  Send applications from your own account. Refresh tokens are
                  encrypted on the server. SOL Ai never asks for your Gmail
                  password.
                </p>
                {state?.gmail && (
                  <p className="account-email">{state.gmail.email}</p>
                )}
                <div className="button-row">
                  <Link
                    className="button"
                    href="/api/gmail/connect"
                    prefetch={false}
                  >
                    {state?.gmail ? "Reconnect Gmail" : "Connect Gmail"}
                    <ArrowUpRight size={15} />
                  </Link>
                  {state?.gmail && (
                    <button
                      className="button secondary"
                      onClick={() => act("gmail", {}, "DELETE")}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
                <hr />
                <h3>Optional reply monitoring</h3>
                <p className="muted">
                  Adds Gmail read permission to inspect your application
                  threads. Classification happens locally; raw emails never go
                  to Gemini or Groq.
                </p>
                <Link
                  className="button secondary"
                  href="/api/gmail/connect?read=true"
                  prefetch={false}
                >
                  Enable reply monitoring <ArrowUpRight size={15} />
                </Link>
                <p className="fine">
                  Google OAuth test-mode tokens may expire. Reconnect when
                  asked. Public distribution may require Google’s verification.
                </p>
              </section>
              <section className="panel padded">
                <ShieldCheck size={27} className="accent" />
                <h2>A small, secure stack.</h2>
                <div className="integration-row">
                  <span>Authentication</span>
                  <b>Clerk</b>
                </div>
                <div className="integration-row">
                  <span>Private database & resumes</span>
                  <b>Neon PostgreSQL</b>
                </div>
                <div className="integration-row">
                  <span>AI providers</span>
                  <b>Gemini · Groq</b>
                </div>
                <div className="integration-row">
                  <span>Hosting</span>
                  <b>Vercel</b>
                </div>
                <p className="fine">
                  Each service needs your own account and configuration.
                  Free-tier eligibility and quotas depend on your accounts.
                </p>
              </section>
            </div>
          )}
          {view === "automation" && (
            <div className="two-col">
              <section className="panel padded">
                <div className="row-between">
                  <h2>Reviewed sending</h2>
                  <Badge
                    tone={
                      state?.workspace.paused !== false ? "orange" : "green"
                    }
                  >
                    {state?.workspace.paused !== false ? "Paused" : "Enabled"}
                  </Badge>
                </div>
                <p className="muted">
                  Every application requires explicit content approval. A
                  persistent outbox preserves queued work. Autonomous unreviewed
                  sending and automatic follow-ups are not enabled in this
                  release.
                </p>
                <Form
                  key={String(state?.workspace.paused)}
                  onSubmit={async (f) => {
                    await act("automation", {
                      paused: f.get("enabled") !== "on",
                      dailyLimit: Number(f.get("limit")),
                    });
                  }}
                >
                  <Field label="Daily application limit (UTC reset)">
                    <input
                      name="limit"
                      type="number"
                      min="1"
                      max="20"
                      defaultValue={state?.workspace.dailyLimit || 8}
                    />
                  </Field>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      name="enabled"
                      defaultChecked={state?.workspace.paused === false}
                    />
                    Enable sending of explicitly reviewed applications
                  </label>
                  <button className="button">
                    <Check size={15} />
                    Save controls
                  </button>
                </Form>
                <hr />
                <button
                  className="button danger"
                  onClick={() =>
                    act("automation", {
                      paused: true,
                      dailyLimit: state?.workspace.dailyLimit || 8,
                    })
                  }
                >
                  <Pause size={16} />
                  Pause new sends
                </button>
                <p className="fine">
                  Requests already in flight may complete. The pause is checked
                  on the server before starting a send.
                </p>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Activity log</h2>
                    <p>Recorded actions from your workspace.</p>
                  </div>
                </div>
                {state?.activity.length ? (
                  <div className="audit-list">
                    {state.activity.map((a) => (
                      <div key={a.id}>
                        <span className="audit-dot" />
                        <div>
                          <b>{a.action.replaceAll("_", " ").toLowerCase()}</b>
                          <small>
                            {new Date(a.createdAt).toLocaleString()}
                            {a.detail && ` · ${a.detail}`}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={Activity}
                    title="A clear record, from day one."
                    detail="Your real workspace activity will appear here."
                  />
                )}
              </section>
            </div>
          )}
          {view === "inbox" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Application conversations</h2>
                  <p>
                    Local classifications are suggestions. Review original
                    messages in Gmail.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => act("gmail/sync", {})}
                >
                  <RefreshCw size={15} />
                  Sync replies
                </button>
              </div>
              {state?.replies.length ? (
                <div className="reply-list">
                  {state.replies.map((r) => (
                    <article key={r.id}>
                      <Badge
                        tone={r.category === "INTERVIEW" ? "green" : "neutral"}
                      >
                        {r.category.replaceAll("_", " ")}
                      </Badge>
                      <p>{r.snippet}</p>
                      <a
                        className="text-button"
                        href="https://mail.google.com/mail/u/0/#inbox"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Review in Gmail <ExternalLink size={14} />
                      </a>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Mail}
                  title="A space for new conversations."
                  detail="Connect Gmail with reply monitoring, then synchronize your application threads."
                  action={
                    <button
                      className="button secondary"
                      onClick={() => go("integrations")}
                    >
                      Manage Gmail <ArrowUpRight size={14} />
                    </button>
                  }
                />
              )}
            </section>
          )}
          {view === "jobs" && (
            <>
              <section className="panel padded">
                <h2>Discover an authorized public job board</h2>
                <p className="muted">
                  Enter a company’s Greenhouse board token or Lever site name.
                  SOL Ai uses official public endpoints; it does not scrape
                  LinkedIn.
                </p>
                <Form
                  onSubmit={async (f) => {
                    await act("jobs/discover", {
                      source: f.get("source"),
                      company: f.get("company"),
                      permitted: f.get("permitted") === "on",
                    });
                  }}
                >
                  <div className="form-grid">
                    <Field label="Public source">
                      <select name="source">
                        <option value="greenhouse">Greenhouse</option>
                        <option value="lever">Lever</option>
                      </select>
                    </Field>
                    <Field label="Board identifier">
                      <input
                        name="company"
                        required
                        pattern="[a-zA-Z0-9_-]+"
                        placeholder="Company's board token"
                      />
                    </Field>
                  </div>
                  <label className="check-label">
                    <input name="permitted" type="checkbox" required />I have
                    checked that this public source permits the intended use.
                  </label>
                  <button className="button">
                    <Search size={16} />
                    Discover jobs
                  </button>
                </Form>
              </section>
              <section className="panel space-top">
                <div className="panel-heading">
                  <div>
                    <h2>Saved opportunities</h2>
                    <p>
                      Skill overlap is a heuristic, never a hiring probability.
                    </p>
                  </div>
                </div>
                {state?.jobs.length ? (
                  <div className="job-grid">
                    {state.jobs.map((j) => (
                      <article key={j.id} className="job-card">
                        <span className="eyebrow">{j.company}</span>
                        <h3>{j.title}</h3>
                        <p className="muted">
                          {j.location || "Location not provided"}
                        </p>
                        <p className="fine">
                          {
                            matchSkills(profile.skills || [], j.description)
                              .explanation
                          }
                        </p>
                        <details>
                          <summary>Job description</summary>
                          <p className="job-description">{j.description}</p>
                        </details>
                        <a
                          href={j.url}
                          className="button secondary small"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open official posting <ExternalLink size={14} />
                        </a>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={Search}
                    title="Possibility is out there."
                    detail="Connect a permitted public company board to save real opportunities here."
                  />
                )}
              </section>
            </>
          )}
        </main>
      </div>
      {selected && (
        <ApplicationModal
          key={selected.id + selected.status}
          app={selected}
          feedback={error}
          resume={resumes.find((r) => r.id === selected.resumeId)}
          close={() => setSelected(null)}
          act={async (p, d) => {
            const r = await act(p, d);
            if (r) setSelected(null);
            return r;
          }}
        />
      )}
    </div>
  );
}
function ApplicationTable({
  apps,
  select,
}: {
  apps: Application[];
  select: (a: Application) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>COMPANY / CONTACT</th>
            <th>POSITION</th>
            <th>TRANSPORT</th>
            <th>OUTCOME</th>
            <th>CREATED</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a.id} onClick={() => select(a)}>
              <td>
                <b>{a.company || a.recipient.split("@")[1]}</b>
                <small>{a.recipient}</small>
              </td>
              <td>{a.role}</td>
              <td>
                <Badge
                  tone={
                    a.status === "SENT"
                      ? "green"
                      : a.status === "SEND_UNCERTAIN"
                        ? "orange"
                        : "purple"
                  }
                >
                  {a.status === "SENT"
                    ? "Gmail accepted"
                    : a.status.replaceAll("_", " ").toLowerCase()}
                </Badge>
              </td>
              <td>{a.outcome.replaceAll("_", " ").toLowerCase()}</td>
              <td>
                {new Date(a.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Review application to ${a.recipient}`}
                >
                  <ArrowUpRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ApplicationModal({
  app,
  feedback,
  resume,
  close,
  act,
}: {
  app: Application;
  feedback: string;
  resume?: Resume;
  close: () => void;
  act: (p: string, d: unknown) => Promise<unknown>;
}) {
  const [confirmed, setConfirmed] = useState(false),
    [subject, setSubject] = useState(app.subject),
    [body, setBody] = useState(app.body),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary",
        ) || [],
      );
    focusable()[0]?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [close]);
  async function run(p: string, d: unknown) {
    setBusy(true);
    try {
      await act(p, d);
    } finally {
      setBusy(false);
    }
  }
  const editable = ["REVIEW_REQUIRED", "APPROVED"].includes(app.status),
    dirty = subject !== app.subject || body !== app.body;
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row-between">
          <div>
            <div className="eyebrow">YOUR APPLICATION, YOUR CALL</div>
            <h2 id="review-title">Review your introduction.</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close review"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <div className="review-meta">
          <span>
            TO <b>{app.recipient}</b>
          </span>
          <span>
            ROLE <b>{app.role}</b>
          </span>
          <span>
            AI{" "}
            <b>
              {app.provider} · {app.model}
            </b>
          </span>
          <span>
            RESUME <b>{resume?.name || "Deleted resume"}</b>
          </span>
        </div>
        {(feedback || app.error) && (
          <div className="notice error" role="alert">
            {feedback || app.error}
          </div>
        )}
        {app.jobUrl && (
          <a
            className="text-button"
            href={app.jobUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open original job posting <ExternalLink size={14} />
          </a>
        )}
        <Field label="Subject">
          <input
            value={subject}
            disabled={!editable}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field label="Email body">
          <textarea
            rows={12}
            value={body}
            disabled={!editable}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        {app.description && (
          <details>
            <summary>Private opportunity notes</summary>
            <p className="job-description">{app.description}</p>
          </details>
        )}
        <p className="fine">
          This is an expression of interest. Verify the recipient, factual
          claims, signature and attachment. Gmail acceptance does not confirm
          delivery. Automatic follow-ups are disabled.
        </p>
        {editable && !dirty && app.status === "REVIEW_REQUIRED" && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I reviewed the content, verified all claims and confirmed this
            recipient and resume are appropriate.
          </label>
        )}
        <div className="button-row">
          {editable && dirty ? (
            <button
              disabled={busy}
              className="button"
              onClick={() =>
                run("applications/edit", { id: app.id, subject, body })
              }
            >
              Save changes & re-review
            </button>
          ) : app.status === "REVIEW_REQUIRED" ? (
            <button
              className="button"
              disabled={!confirmed || busy}
              onClick={() =>
                run("applications/approve", {
                  id: app.id,
                  claimsConfirmed: true,
                })
              }
            >
              <Check size={16} />
              Approve content
            </button>
          ) : app.status === "APPROVED" ? (
            <button
              className="button"
              disabled={busy}
              onClick={() => run("applications/send", { id: app.id })}
            >
              <Send size={16} />
              Send through Gmail
            </button>
          ) : app.status === "QUEUED" ? (
            <button
              className="button"
              disabled={busy}
              onClick={() => run("applications/retry", { id: app.id })}
            >
              Process queued application
            </button>
          ) : (
            <Badge tone={app.status === "SENT" ? "green" : "orange"}>
              {app.status}
            </Badge>
          )}
          {resume && (
            <a className="button secondary" href={`/api/resumes/${resume.id}`}>
              <Download size={15} />
              Review attachment
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
function Contacts({
  contacts,
  act,
}: {
  contacts: Contact[];
  act: (p: string, d: unknown, m?: string) => Promise<unknown>;
}) {
  const [text, setText] = useState(""),
    [rows, setRows] = useState<Contact[]>([]),
    [issues, setIssues] = useState(""),
    [permitted, setPermitted] = useState(false),
    [busy, setBusy] = useState(false);
  async function preview() {
    try {
      let values: Contact[] = [];
      if (/email/i.test(text.split("\n")[0]) && text.includes(","))
        values = parseContacts(text);
      else {
        const parsed = normalizeEmails(text);
        values = parsed.valid.map((email) => ({
          email,
          name: "",
          company: "",
          title: "",
          source: "Pasted permitted list",
        }));
        setIssues(
          `${parsed.invalid.length} invalid entries; ${parsed.duplicates} duplicates removed`,
        );
      }
      const seen = new Set<string>();
      const existing = new Set(contacts.map((c) => c.email));
      let invalid = 0;
      values = values.filter((v) => {
        v.email = v.email.toLowerCase().trim();
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) ||
          seen.has(v.email) ||
          existing.has(v.email)
        ) {
          invalid++;
          return false;
        }
        seen.add(v.email);
        return true;
      });
      setRows(values);
      setIssues(
        `${values.length} new valid contacts. ${invalid} invalid, duplicate or existing rows excluded. Review company groups and professional relevance before importing.`,
      );
    } catch (e) {
      setIssues((e as Error).message);
      setRows([]);
    }
  }
  return (
    <>
      <section className="panel padded">
        <h2>Import, then review.</h2>
        <p className="muted">
          Paste email addresses or CSV with Email, First Name, Last Name,
          Company and Title columns. Header aliases are detected automatically.
          Importing does not generate or send applications.
        </p>
        <Field label="CSV, XLSX or plain text file">
          <input
            type="file"
            accept=".csv,.xlsx,.txt"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 4 * 1024 * 1024) {
                setIssues("Maximum file size is 4 MB");
                return;
              }
              try {
                if (file.name.endsWith(".xlsx")) {
                  const ExcelJS = await import("exceljs");
                  const book = new ExcelJS.Workbook();
                  await book.xlsx.load(await file.arrayBuffer());
                  const sheet = book.worksheets[0];
                  if (!sheet) throw new Error("Empty workbook");
                  if (sheet.rowCount > 1001)
                    throw new Error("Maximum 1000 records");
                  const csv: string[] = [];
                  sheet.eachRow((row) => {
                    const values = row.values as unknown[];
                    csv.push(
                      values
                        .slice(1)
                        .map(
                          (v) =>
                            '"' + String(v ?? "").replaceAll('"', '""') + '"',
                        )
                        .join(","),
                    );
                  });
                  setText(csv.join("\n"));
                } else setText(await file.text());
              } catch (e) {
                setIssues((e as Error).message);
              }
            }}
          />
        </Field>
        <textarea
          rows={7}
          aria-label="Contact import input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Email,First Name,Company,Title\n"}
        />
        <div className="button-row">
          <button className="button secondary" onClick={preview}>
            <Search size={16} />
            Preview & validate
          </button>
          <span className="fine">Up to 1,000 records per import</span>
        </div>
        {issues && <div className="notice">{issues}</div>}
        {rows.length > 0 && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>EMAIL</th>
                    <th>NAME</th>
                    <th>COMPANY</th>
                    <th>TITLE</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((r) => (
                    <tr key={r.email}>
                      <td>{r.email}</td>
                      <td>{r.name || "Unknown"}</td>
                      <td>{r.company || "Unknown"}</td>
                      <td>{r.title || "Requires review"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine">
              Preview shows the first 30 of {rows.length} rows. Repeated
              companies are subject to a server-side 30-day sending cooldown.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={permitted}
                onChange={(e) => setPermitted(e.target.checked)}
              />
              I confirm permitted use and have reviewed the contacts for
              professional relevance.
            </label>
            <button
              className="button"
              disabled={!permitted || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await act("contacts", { rows, permitted: true });
                  if (r) {
                    setRows([]);
                    setText("");
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              Import {rows.length} contacts
            </button>
          </>
        )}
      </section>
      <section className="panel space-top">
        <div className="panel-heading">
          <div>
            <h2>
              Your recruiter contacts{" "}
              <span className="count">{contacts.length}</span>
            </h2>
            <p>
              No inferred hiring status. Sources remain attached to each
              contact.
            </p>
          </div>
        </div>
        {contacts.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CONTACT</th>
                  <th>COMPANY</th>
                  <th>SOURCE</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>{c.name || c.email}</b>
                      <small>{c.email}</small>
                    </td>
                    <td>{c.company || "Unknown"}</td>
                    <td>{c.source}</td>
                    <td>
                      <Badge tone={c.suppressed ? "orange" : "neutral"}>
                        {c.suppressed
                          ? "Suppressed"
                          : "Requires individual review"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label="Delete contact"
                        onClick={() => act("contacts", { id: c.id }, "DELETE")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={Users}
            title="Make room for the right connections."
            detail="Your imported professional contacts will appear here."
          />
        )}
      </section>
    </>
  );
}
function Providers({
  providers,
  usage,
  act,
}: {
  providers: Provider[];
  usage: State["usage"];
  act: (
    p: string,
    d: unknown,
    m?: string,
  ) => Promise<{ models?: string[] } | null>;
}) {
  const [kind, setKind] = useState("groq"),
    [key, setKey] = useState(""),
    [models, setModels] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  return (
    <div className="two-col">
      <section className="panel padded">
        <h2>Connect your AI provider</h2>
        <p className="muted">
          Keys are encrypted server-side and never returned to the browser.
          Available models come from your provider’s official API.
        </p>
        <Form
          onSubmit={async (f) => {
            const r = await act("providers", {
              kind,
              key,
              model: f.get("model"),
              freeConfirmed: f.get("free") === "on",
              dailyRequests: Number(f.get("requests")),
              dailyTokens: Number(f.get("tokens")),
              maxOutput: Number(f.get("output")),
            });
            if (r) {
              setKey("");
              setModels([]);
            }
          }}
        >
          <Field label="Provider">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setModels([]);
                setKey("");
              }}
            >
              <option value="groq">Groq</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </Field>
          <Field label="API key">
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              autoComplete="off"
              placeholder="Stored encrypted, shown only while entering"
            />
          </Field>
          <button
            type="button"
            disabled={!key || busy}
            className="button secondary"
            onClick={async () => {
              setBusy(true);
              try {
                const r = await act("providers/models", { kind, key });
                if (r?.models) setModels(r.models);
              } finally {
                setBusy(false);
              }
            }}
          >
            <RefreshCw size={15} />
            Test key & discover models
          </button>
          <Field label="Approved model">
            <select name="model" required>
              <option value="">Discover models first</option>
              {models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Daily requests">
              <input
                name="requests"
                type="number"
                defaultValue={30}
                min={1}
                max={500}
              />
            </Field>
            <Field label="Daily token budget">
              <input
                name="tokens"
                type="number"
                defaultValue={30000}
                min={2000}
                max={1000000}
              />
            </Field>
          </div>
          <Field label="Maximum output tokens">
            <input
              name="output"
              type="number"
              defaultValue={512}
              min={256}
              max={1500}
            />
          </Field>
          <label className="check-label">
            <input type="checkbox" name="free" required />I verified this model
            is eligible for my provider’s free tier and approved its data terms.
          </label>
          <button className="button">
            <ShieldCheck size={16} />
            Encrypt & save connection
          </button>
        </Form>
      </section>
      <div>
        <section className="panel padded">
          <h2>Your connections</h2>
          {providers.length ? (
            providers.map((p) => (
              <div className="provider-card" key={p.kind}>
                <div className="row-between">
                  <h3>{p.kind === "groq" ? "Groq" : "Gemini"}</h3>
                  <Badge tone="green">Key stored</Badge>
                </div>
                <p className="muted">{p.model}</p>
                <p className="fine">
                  Budget: {p.dailyRequests} requests ·{" "}
                  {p.dailyTokens.toLocaleString()} tokens / UTC day
                </p>
                <button
                  className="text-button danger-text"
                  onClick={() => act("providers", { kind: p.kind }, "DELETE")}
                >
                  <Trash2 size={14} />
                  Remove encrypted key
                </button>
              </div>
            ))
          ) : (
            <p className="muted">No provider connected yet.</p>
          )}
          <hr />
          <div className="row-between">
            <span>Requests in the last 24 hours</span>
            <b>{usage.length}</b>
          </div>
          <div className="row-between">
            <span>Reported tokens</span>
            <b>{usage.reduce((n, u) => n + u.tokens, 0).toLocaleString()}</b>
          </div>
        </section>
        <section className="panel padded space-top">
          <ShieldCheck className="accent" size={25} />
          <h2>Privacy before intelligence.</h2>
          <p className="muted">
            Only a fixed set of role and confirmed skill categories crosses the
            AI boundary. Resumes, recruiter addresses, names, private job notes
            and Gmail threads do not.
          </p>
          <p className="fine">
            No automatic provider fallback. Model discovery does not prove free
            eligibility. Your provider’s actual billing and rate limits remain
            authoritative.
          </p>
        </section>
      </div>
    </div>
  );
}
