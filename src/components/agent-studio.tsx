"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileSearch,
  Layers3,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { WorkflowStep } from "@/lib/workflow";
export type AgentRunView = {
  id: string;
  mode: string;
  goal: string;
  status: string;
  steps: WorkflowStep[];
  applicationId: string | null;
  summary: string;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};
const display = (value: string) => value.toLowerCase().replaceAll("_", " ");
export default function AgentStudio({
  runs,
  preparing,
  onPrepare,
  onOpen,
}: {
  runs: AgentRunView[];
  preparing: boolean;
  onPrepare: () => void;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState("");
  const visible = runs.filter(
    (run) =>
      filter === "all" ||
      (filter === "review" &&
        ["WAITING_REVIEW", "NEEDS_REVIEW"].includes(run.status)) ||
      (filter === "stopped" && ["FAILED", "INTERRUPTED"].includes(run.status)),
  );
  const current = visible.find((run) => run.id === selected) || visible[0];
  const waiting = runs.filter((r) => r.status === "WAITING_REVIEW").length,
    stopped = runs.filter((r) =>
      ["FAILED", "INTERRUPTED", "NEEDS_REVIEW"].includes(r.status),
    ).length;
  return (
    <div className="studio">
      <section className="studio-intro">
        <div>
          <span className="studio-kicker">
            <Sparkles size={15} />
            AGENT STUDIO
          </span>
          <h2>
            A clear goal.
            <br />
            An accountable agent.
          </h2>
          <p>
            Your agent selects evidence, checks what it found and decides
            whether it can prepare a draft. Every action leaves a record.
          </p>
          <div className="studio-tools">
            <span>
              <FileSearch size={14} />
              Local retrieval
            </span>
            <span>
              <Layers3 size={14} />
              Source checks
            </span>
            <span>
              <ShieldCheck size={14} />
              Human approval
            </span>
          </div>
        </div>
        <div className="studio-cta">
          <span className={preparing ? "live-state running" : "live-state"}>
            <i />
            {preparing ? "Preparation in progress" : "Ready when you are"}
          </span>
          <button className="button" onClick={onPrepare} disabled={preparing}>
            <Play size={15} />
            Start a preparation
          </button>
          <p>No email is sent from this workspace.</p>
        </div>
      </section>
      <div className="studio-metrics">
        {[
          { label: "Recent runs", value: runs.length, icon: Layers3 },
          { label: "Ready for your review", value: waiting, icon: Check },
          { label: "Need attention", value: stopped, icon: CircleAlert },
        ].map((metric) => (
          <div key={metric.label}>
            <metric.icon size={19} />
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
      <section className="run-workspace">
        <aside className="run-library">
          <div className="run-library-heading">
            <h3>Run history</h3>
            <span>{visible.length}</span>
          </div>
          <div className="segmented-control" aria-label="Filter agent runs">
            {[
              { id: "all", label: "All" },
              { id: "review", label: "Review" },
              { id: "stopped", label: "Stopped" },
            ].map((item) => (
              <button
                key={item.id}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {visible.length ? (
            visible.map((run) => (
              <button
                key={run.id}
                className={`run-item ${current?.id === run.id ? "selected" : ""}`}
                onClick={() => setSelected(run.id)}
              >
                <span
                  className={`run-status-dot ${run.status.toLowerCase()}`}
                />
                <div>
                  <b>
                    {run.mode === "agentic"
                      ? "Agent preparation"
                      : "Assisted preparation"}
                  </b>
                  <small>
                    {new Date(run.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                  <span>{display(run.status)}</span>
                </div>
                <ChevronRight size={15} />
              </button>
            ))
          ) : (
            <div className="run-empty-small">
              {preparing
                ? "Your run will appear as soon as the first checkpoint is saved."
                : "No runs in this view yet."}
            </div>
          )}
        </aside>
        <div className="run-inspector">
          {current ? (
            <>
              <div className="run-inspector-heading">
                <div>
                  <span className="studio-kicker">EXECUTION RECORD</span>
                  <h3>{current.goal}</h3>
                  <p>{current.summary}</p>
                </div>
                <span
                  className={`status-label ${current.status.toLowerCase()}`}
                >
                  {display(current.status)}
                </span>
              </div>
              <div className="run-properties">
                <span>
                  <b>Mode</b>
                  {current.mode === "agentic" ? "Observe and act" : "Assisted"}
                </span>
                <span>
                  <b>Checkpoints</b>
                  {current.steps.length}
                </span>
                <span>
                  <b>Sending</b>Requires approval
                </span>
              </div>
              <ol className="agent-timeline">
                {current.steps.map((step, index) => (
                  <li key={index}>
                    <span
                      className={
                        step.status === "waiting"
                          ? "timeline-marker waiting"
                          : "timeline-marker"
                      }
                    >
                      {step.status === "waiting" ? (
                        <Clock3 size={14} />
                      ) : (
                        <Check size={14} />
                      )}
                    </span>
                    <div>
                      <span className="timeline-stage">
                        STEP {String(index + 1).padStart(2, "0")}
                      </span>
                      <h4>{display(step.tool)}</h4>
                      <p>{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {current.errorCode && (
                <div className="run-stop">
                  <CircleAlert size={17} />
                  <div>
                    <b>{display(current.errorCode)}</b>
                    <p>
                      The workflow stopped before dispatch. Review the evidence
                      or settings, then start a new preparation.
                    </p>
                  </div>
                </div>
              )}
              {current.applicationId && (
                <button
                  className="button"
                  onClick={() => onOpen(current.applicationId!)}
                >
                  Review prepared application <ArrowUpRight size={15} />
                </button>
              )}
              <div className="run-id">Run reference: {current.id}</div>
            </>
          ) : (
            <div className="inspector-empty">
              <span>
                <FileSearch size={31} />
              </span>
              <h3>See how each decision is made.</h3>
              <p>
                Start a preparation to inspect tool choices, retrieved evidence
                and review checkpoints here.
              </p>
              <button className="button secondary" onClick={onPrepare}>
                Prepare an application <ArrowUpRight size={15} />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
