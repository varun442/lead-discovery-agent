"use client";

import { useEffect, useState } from "react";
import { Clock3, Link as LinkIcon, Save, X } from "lucide-react";

import type { JobDescriptionContext } from "@/lib/types";

interface JobDescriptionDraft {
  title: string;
  company: string;
  source_url: string;
  text: string;
}

interface JobDescriptionDrawerProps {
  open: boolean;
  activeJob: JobDescriptionContext | null;
  recentJobs: JobDescriptionContext[];
  onClose: () => void;
  onSave: (draft: JobDescriptionDraft) => void;
  onUseRecent: (job: JobDescriptionContext) => void;
}

const EMPTY_DRAFT: JobDescriptionDraft = {
  title: "",
  company: "",
  source_url: "",
  text: ""
};

export function JobDescriptionDrawer({
  open,
  activeJob,
  recentJobs,
  onClose,
  onSave,
  onUseRecent
}: JobDescriptionDrawerProps) {
  const [draft, setDraft] = useState<JobDescriptionDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (activeJob) {
      setDraft({
        title: activeJob.title || "",
        company: activeJob.company || "",
        source_url: activeJob.source_url || "",
        text: activeJob.text || ""
      });
      return;
    }
    setDraft(EMPTY_DRAFT);
  }, [open, activeJob]);

  if (!open) return null;

  const submit = () => {
    setError(null);
    if (!draft.text.trim() || draft.text.trim().length < 40) {
      setError("Paste a fuller job description (at least 40 characters).");
      return;
    }
    onSave({
      title: draft.title.trim(),
      company: draft.company.trim(),
      source_url: draft.source_url.trim(),
      text: draft.text.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Job Description</h3>
            <p className="text-xs text-muted">Set once, then send AI email from each lead card in one click.</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border p-2 text-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Job title (e.g., Senior Backend Engineer)"
            className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm text-foreground placeholder:text-muted"
          />
          <input
            value={draft.company}
            onChange={(event) => setDraft((prev) => ({ ...prev, company: event.target.value }))}
            placeholder="Company for this role"
            className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm text-foreground placeholder:text-muted"
          />
          <div className="relative">
            <LinkIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              value={draft.source_url}
              onChange={(event) => setDraft((prev) => ({ ...prev, source_url: event.target.value }))}
              placeholder="Job URL (optional)"
              className="w-full rounded-xl border border-border bg-black/40 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted"
            />
          </div>
          <textarea
            value={draft.text}
            onChange={(event) => setDraft((prev) => ({ ...prev, text: event.target.value }))}
            placeholder="Paste full job description here..."
            className="min-h-[220px] w-full rounded-xl border border-border bg-black/40 px-3 py-2 text-sm text-foreground placeholder:text-muted"
          />
          {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
          <button
            onClick={submit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-gradient-to-r from-accent to-violet-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            <Save className="h-4 w-4" /> Save Active JD
          </button>
        </div>

        {recentJobs.length ? (
          <div className="mt-6 min-h-0 flex-1 overflow-auto">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted">Recent JDs</p>
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => onUseRecent(job)}
                  className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 text-left hover:border-zinc-600"
                >
                  <p className="truncate text-sm font-medium text-foreground">{job.title || "Untitled role"}</p>
                  <p className="truncate text-xs text-muted">{job.company || "Unknown company"}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted">
                    <Clock3 className="h-3 w-3" />
                    {new Date(job.updated_at).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
