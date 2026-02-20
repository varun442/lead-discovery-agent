"use client";

import { Building2, Clock3, ExternalLink, History, Link2, Loader2, Trash2, X } from "lucide-react";

import { formatHistoryTimestamp } from "@/lib/company-search-history";
import type { CompanySearchHistoryItem } from "@/lib/types";

interface PreviousCompanySearchesDrawerProps {
  open: boolean;
  items: CompanySearchHistoryItem[];
  isLoading: boolean;
  error: string | null;
  deletingId: string | null;
  isClearing: boolean;
  onClose: () => void;
  onLoad: (item: CompanySearchHistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

function statusClassName(status: CompanySearchHistoryItem["status"]): string {
  if (status === "success") return "border-zinc-400/50 bg-zinc-100/10 text-zinc-100";
  return "border-zinc-700/60 bg-zinc-800/50 text-zinc-400";
}

export function PreviousCompanySearchesDrawer({
  open,
  items,
  isLoading,
  error,
  deletingId,
  isClearing,
  onClose,
  onLoad,
  onDelete,
  onClearAll
}: PreviousCompanySearchesDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Previous company searches</h3>
            <p className="text-xs text-muted">Last 15, deduped by company domain</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border p-2 text-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={onClearAll}
            disabled={isClearing || items.length === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isClearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Clear all
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
          {isLoading ? (
            <p className="text-sm text-muted">Loading previous searches...</p>
          ) : error ? (
            <p className="rounded-lg border border-zinc-600/60 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200">{error}</p>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-border bg-black/30 p-4 text-center">
              <History className="mx-auto h-5 w-5 text-muted" />
              <p className="mt-2 text-sm text-foreground">No previous searches yet.</p>
              <p className="mt-1 text-xs text-muted">Run a company search and it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-black/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.company_name || item.search_domain}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                        <Building2 className="h-3 w-3" />
                        {item.search_domain}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${statusClassName(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <p className="truncate">Website: {item.website_url}</p>
                    {item.linkedin_url ? (
                      <p className="truncate">LinkedIn: {item.linkedin_url}</p>
                    ) : (
                      <p className="truncate">LinkedIn: not provided</p>
                    )}
                    <p>Contacts: {item.contacts_count}</p>
                    <p className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {formatHistoryTimestamp(item.last_searched_at)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onLoad(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Load
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted">
          <Link2 className="h-3 w-3" />
          “Load” restores saved fields and cached results (if available). It does not rerun search.
        </p>
      </div>
    </div>
  );
}
