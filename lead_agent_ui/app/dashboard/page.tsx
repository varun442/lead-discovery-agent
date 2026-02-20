"use client";

import { History } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import { ActionBar } from "@/components/action-bar";
import { AgentProgressTimeline } from "@/components/agent-progress-timeline";
import { CompanyInputCard } from "@/components/company-input-card";
import { CompanySummaryCard } from "@/components/company-summary-card";
import { EmptyState } from "@/components/empty-state";
import { Header } from "@/components/header";
import { JobContextBar } from "@/components/job-context-bar";
import { JobDescriptionDrawer } from "@/components/job-description-drawer";
import { LeadList } from "@/components/lead-list";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PreviousCompanySearchesDrawer } from "@/components/previous-company-searches-drawer";
import { Card } from "@/components/ui/card";
import { ToastStack, type ToastItem, type ToastKind } from "@/components/ui/toast-stack";
import { extractSearchDomain, normalizeHistoryPayload, type CompanySearchHistoryInput } from "@/lib/company-search-history";
import { streamLeads } from "@/lib/api";
import { classifyRole, filterContacts, type RoleFilter } from "@/lib/lead-utils";
import {
  mapDraftFailure,
  outOfCreditsBanner,
  toBalance,
  type CreditBannerState,
  type DraftFailurePayload,
  type LeadSendState
} from "@/lib/outreach-credit-ui";
import { resolveSearchDomain, shouldResetOnCompanyChange } from "@/lib/search-context";
import { createClient } from "@/lib/supabase/client";
import type { CompanySearchHistoryItem, Contact, JobDescriptionContext, LeadResponse } from "@/lib/types";

const ACTIVE_JD_KEY_PREFIX = "lead_agent_active_jd";
const RECENT_JD_KEY_PREFIX = "lead_agent_recent_jds";
const HOME_STATE_KEY_PREFIX = "lead_agent_home_state_v1";

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function guessLinkedinFromWebsite(website: string): string {
  const host = website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
  const slug = host.split(".")[0];
  return slug ? `https://linkedin.com/company/${slug}` : "";
}

function contactKey(contact: Contact): string {
  return contact.linkedin || contact.email || contact.name;
}

function openCompose(to: string, subject: string, body: string) {
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const popup = window.open(gmailUrl, "_blank", "noopener,noreferrer");
  if (!popup) {
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }
}

function normalizeWarningMessage(input?: string): { title: string; detail: string } | null {
  if (!input) return null;
  const warning = input.trim();
  if (!warning) return null;

  const low = warning.toLowerCase();
  if (
    low.includes("couldn't confidently match linkedin profiles") ||
    low.includes("no relevant contacts matched the target company")
  ) {
    return {
      title: "No strong company-match contacts yet",
      detail:
        "Try the exact company website and official LinkedIn company URL. If it still returns empty, try another company or check SerpAPI credits."
    };
  }

  return { title: "Agent note", detail: warning };
}

function normalizeRoleFilter(value: unknown): RoleFilter {
  if (value === "managers" || value === "engineers" || value === "recruiters") return value;
  return "managers";
}

export default function HomePage() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [homeStateRestored, setHomeStateRestored] = useState(false);
  const [jdStateRestored, setJdStateRestored] = useState(false);
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [autoDetectLinkedin, setAutoDetectLinkedin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LeadResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [activityMessages, setActivityMessages] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("managers");
  const [activeJob, setActiveJob] = useState<JobDescriptionContext | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobDescriptionContext[]>([]);
  const [isJobDrawerOpen, setIsJobDrawerOpen] = useState(false);
  const [pendingContact, setPendingContact] = useState<Contact | null>(null);
  const [sendStates, setSendStates] = useState<Record<string, LeadSendState>>({});
  const [lastDraftError, setLastDraftError] = useState<string | null>(null);
  const [lastDraftPreview, setLastDraftPreview] = useState<{
    to: string;
    subject: string;
    body: string;
  } | null>(null);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [isOutOfCredits, setIsOutOfCredits] = useState(false);
  const [creditBanner, setCreditBanner] = useState<CreditBannerState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingSendDraft, setPendingSendDraft] = useState<{
    key: string;
    name: string;
    to: string;
    subject: string;
    body: string;
  } | null>(null);
  const [activeSendKey, setActiveSendKey] = useState<string | null>(null);
  const [unlockedEmails, setUnlockedEmails] = useState<Record<string, true>>({});
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<CompanySearchHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyDeleteId, setHistoryDeleteId] = useState<string | null>(null);
  const [isHistoryClearing, setIsHistoryClearing] = useState(false);
  const [lastSearchDomain, setLastSearchDomain] = useState<string | null>(null);

  const homeStateKey = authUserId ? `${HOME_STATE_KEY_PREFIX}:${authUserId}` : null;
  const activeJdKey = authUserId ? `${ACTIVE_JD_KEY_PREFIX}:${authUserId}` : null;
  const recentJdKey = authUserId ? `${RECENT_JD_KEY_PREFIX}:${authUserId}` : null;
  const isStateReady = authResolved && homeStateRestored && jdStateRestored;

  const filteredContacts = useMemo(
    () => filterContacts(result?.contacts || [], roleFilter, "all"),
    [result?.contacts, roleFilter]
  );
  const roleCounts = useMemo(() => {
    const counts: Record<RoleFilter, number> = {
      managers: 0,
      engineers: 0,
      recruiters: 0
    };
    for (const contact of result?.contacts || []) {
      counts[classifyRole(contact)] += 1;
    }
    return counts;
  }, [result?.contacts]);

  const log = (message: string) => {
    setActivityMessages((prev) => [...prev, `${nowTime()} ${message}`]);
  };

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    const item: ToastItem = { id: crypto.randomUUID(), kind, message };
    setToasts((prev) => [...prev, item]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearOutOfCreditsSendStates = useCallback(() => {
    setSendStates((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [key, state] of Object.entries(prev)) {
        if (state === "out_of_credits") {
          changed = true;
          next[key] = "idle";
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const loadQuota = useCallback(async () => {
    try {
      const response = await fetch("/api/outreach/quota", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        credits?: { balance?: number };
      };
      const balance = toBalance(payload.credits?.balance);
      setCreditsBalance(balance);
      const zero = balance <= 0;
      setIsOutOfCredits(zero);
      if (zero) {
        setCreditBanner(outOfCreditsBanner());
      } else {
        setCreditBanner((prev) => (prev?.title === "You're out of credits" ? null : prev));
        clearOutOfCreditsSendStates();
      }
    } catch {
      // keep prior known state
    }
  }, [clearOutOfCreditsSendStates]);

  const fetchSearchHistory = useCallback(async () => {
    if (!authUserId) {
      setHistoryItems([]);
      setHistoryError(null);
      return;
    }

    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/company-search-history?limit=15", { cache: "no-store" });
      const payload = (await response.json()) as { error?: string; items?: CompanySearchHistoryItem[] };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load previous searches.");
      }
      setHistoryItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to load previous searches.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, [authUserId]);

  const saveSearchHistory = async (input: CompanySearchHistoryInput) => {
    if (!authUserId) return;

    try {
      const normalized = normalizeHistoryPayload(input);
      if (!normalized.website_url || !normalized.search_domain) return;

      const response = await fetch("/api/company-search-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized)
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to save previous search.");
      }
      await fetchSearchHistory();
    } catch (error) {
      log(`History save failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const resetOutreachUiState = useCallback(() => {
    setLastDraftPreview(null);
    setPendingSendDraft(null);
    setLastDraftError(null);
    setActiveSendKey(null);
    setSendStates({});
    setUnlockedEmails({});
    setPendingContact(null);
  }, []);

  const handleCompanyChange = useCallback(
    (nextDomainRaw: string) => {
      const nextDomain = nextDomainRaw.trim().toLowerCase();
      const previousDomain = (lastSearchDomain || "").trim().toLowerCase();

      if (shouldResetOnCompanyChange(previousDomain, nextDomain)) {
        resetOutreachUiState();
        setActiveJob(null);
        log(`Company changed (${previousDomain} -> ${nextDomain}). Cleared previous draft and job context.`);
      }

      if (nextDomain) setLastSearchDomain(nextDomain);
    },
    [lastSearchDomain, resetOutreachUiState]
  );

  const onLoadHistoryItem = (item: CompanySearchHistoryItem) => {
    const resolvedLinkedin = item.linkedin_url || guessLinkedinFromWebsite(item.website_url);
    const nextDomain = resolveSearchDomain({
      searchDomain: item.search_domain,
      result: item.result_snapshot,
      website: item.website_url
    });

    handleCompanyChange(nextDomain);
    setWebsite(item.website_url);
    setLinkedin(resolvedLinkedin);
    setAutoDetectLinkedin(false);
    setRoleFilter("managers");
    setRequestError(item.error_message || null);

    if (item.result_snapshot) {
      setResult(item.result_snapshot);
      log(`Loaded cached results: ${item.company_name || item.search_domain}`);
    } else {
      setResult(null);
      log(`No cached result found. Refreshing from backend for ${item.company_name || item.search_domain}`);
      void runDiscovery(item.website_url, resolvedLinkedin, "history");
    }

    setIsHistoryDrawerOpen(false);
  };

  const onDeleteHistoryItem = async (id: string) => {
    setHistoryDeleteId(id);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/company-search-history?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete search history item.");
      }
      await fetchSearchHistory();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to delete search history item.");
    } finally {
      setHistoryDeleteId(null);
    }
  };

  const onClearSearchHistory = async () => {
    setIsHistoryClearing(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/company-search-history?all=true", { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to clear search history.");
      }
      await fetchSearchHistory();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to clear search history.");
    } finally {
      setIsHistoryClearing(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (mounted) setAuthUserId(user?.id || null);
      } finally {
        if (mounted) setAuthResolved(true);
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authResolved) return;
    if (!authUserId) {
      setHistoryItems([]);
      setHistoryError(null);
      return;
    }
    void fetchSearchHistory();
  }, [authResolved, authUserId, fetchSearchHistory]);

  useEffect(() => {
    if (!authResolved) return;
    if (!authUserId) {
      setCreditsBalance(null);
      setIsOutOfCredits(false);
      setCreditBanner(null);
      return;
    }
    void loadQuota();

    const refreshQuota = () => {
      void loadQuota();
    };

    window.addEventListener("quota-refresh", refreshQuota);
    return () => {
      window.removeEventListener("quota-refresh", refreshQuota);
    };
  }, [authResolved, authUserId, loadQuota]);

  useEffect(() => {
    if (!authResolved) return;
    if (!homeStateKey) {
      setHomeStateRestored(true);
      return;
    }
    setWebsite("");
    setLinkedin("");
    setAutoDetectLinkedin(false);
    setResult(null);
    setRequestError(null);
    setRoleFilter("managers");
    setUnlockedEmails({});
    setLastSearchDomain(null);

    try {
      const raw = window.localStorage.getItem(homeStateKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        website?: string;
        linkedin?: string;
        autoDetectLinkedin?: boolean;
        result?: LeadResponse | null;
        requestError?: string | null;
        roleFilter?: RoleFilter;
        unlockedEmails?: Record<string, true>;
        lastSearchDomain?: string | null;
      };

      if (typeof parsed.website === "string") setWebsite(parsed.website);
      if (typeof parsed.linkedin === "string") setLinkedin(parsed.linkedin);
      if (typeof parsed.autoDetectLinkedin === "boolean") setAutoDetectLinkedin(parsed.autoDetectLinkedin);
      if (parsed.result) setResult(parsed.result);
      if (typeof parsed.requestError === "string") setRequestError(parsed.requestError);
      if (parsed.requestError === null) setRequestError(null);
      setRoleFilter(normalizeRoleFilter(parsed.roleFilter));
      if (parsed.unlockedEmails) setUnlockedEmails(parsed.unlockedEmails);
      const restoredDomain = resolveSearchDomain({
        searchDomain: parsed.lastSearchDomain,
        result: parsed.result || null,
        website: parsed.website
      });
      setLastSearchDomain(restoredDomain || null);
    } catch {
      // ignore invalid persisted state
    } finally {
      setHomeStateRestored(true);
    }
  }, [authResolved, homeStateKey]);

  useEffect(() => {
    if (!authResolved || !homeStateKey || isLoading) return;
    const snapshot = {
      website,
      linkedin,
      autoDetectLinkedin,
      result,
      requestError,
      roleFilter,
      unlockedEmails,
      lastSearchDomain
    };
    window.localStorage.setItem(homeStateKey, JSON.stringify(snapshot));
  }, [
    authResolved,
    homeStateKey,
    website,
    linkedin,
    autoDetectLinkedin,
    result,
    requestError,
    roleFilter,
    unlockedEmails,
    lastSearchDomain,
    isLoading
  ]);

  useEffect(() => {
    if (!authResolved) return;
    if (!activeJdKey || !recentJdKey) {
      setJdStateRestored(true);
      return;
    }
    setActiveJob(null);
    setRecentJobs([]);

    try {
      const rawActive = window.localStorage.getItem(activeJdKey);
      const rawRecent = window.localStorage.getItem(recentJdKey);
      if (rawActive) setActiveJob(JSON.parse(rawActive) as JobDescriptionContext);
      if (rawRecent) setRecentJobs(JSON.parse(rawRecent) as JobDescriptionContext[]);
    } catch {
      setActiveJob(null);
      setRecentJobs([]);
    } finally {
      setJdStateRestored(true);
    }
  }, [authResolved, activeJdKey, recentJdKey]);

  useEffect(() => {
    if (!authResolved || !activeJdKey) return;
    if (!activeJob) {
      window.localStorage.removeItem(activeJdKey);
      return;
    }
    window.localStorage.setItem(activeJdKey, JSON.stringify(activeJob));
  }, [authResolved, activeJdKey, activeJob]);

  useEffect(() => {
    if (!authResolved || !recentJdKey) return;
    window.localStorage.setItem(recentJdKey, JSON.stringify(recentJobs));
  }, [authResolved, recentJdKey, recentJobs]);

  const sendEmailForLead = async (contact: Contact, jobOverride?: JobDescriptionContext) => {
    if (!contact.email) return;
    setLastDraftError(null);
    const key = contactKey(contact);

    if (isOutOfCredits || (creditsBalance !== null && creditsBalance <= 0)) {
      setSendStates((prev) => ({ ...prev, [key]: "out_of_credits" }));
      setCreditBanner(outOfCreditsBanner());
      pushToast("error", "Out of credits. Add credits to continue.");
      log(`Out of credits while preparing draft for ${contact.name}`);
      return;
    }

    const job = jobOverride || activeJob;
    if (!job) {
      setPendingContact(contact);
      setIsJobDrawerOpen(true);
      log(`Set a job description before sending to ${contact.name}`);
      return;
    }

    setActiveSendKey(key);
    setSendStates((prev) => ({ ...prev, [key]: "sending" }));
    try {
      const draftResponse = await fetch("/api/outreach/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          company: result?.company || "",
          job
        })
      });
      const draftJson = (await draftResponse.json()) as DraftFailurePayload & {
        subject?: string;
        body?: string;
        credits?: {
          charged?: number;
          balance?: number;
          event_type?: string;
        };
      };

      if (!draftResponse.ok || !draftJson.subject || !draftJson.body) {
        const mapped = mapDraftFailure(draftResponse.status, draftJson);
        setSendStates((prev) => ({ ...prev, [key]: mapped.sendState }));
        setIsOutOfCredits(mapped.isOutOfCredits);
        if (mapped.banner) {
          setCreditBanner(mapped.banner);
        }
        pushToast(mapped.toast.kind, mapped.toast.message);
        setLastDraftError(mapped.detailMessage);
        log(`${mapped.detailMessage} (${contact.name})`);

        const nextBalance = toBalance(draftJson.credits?.balance);
        if (draftJson.credits?.balance !== undefined) {
          setCreditsBalance(nextBalance);
          if (nextBalance <= 0) {
            setIsOutOfCredits(true);
            setCreditBanner(outOfCreditsBanner());
            setSendStates((prev) => ({ ...prev, [key]: "out_of_credits" }));
          }
        }
        return;
      }

      const nextBalance = toBalance(draftJson.credits?.balance);
      if (draftJson.credits?.balance !== undefined) {
        setCreditsBalance(nextBalance);
        const zero = nextBalance <= 0;
        setIsOutOfCredits(zero);
        if (zero) {
          setCreditBanner(outOfCreditsBanner());
        } else {
          setCreditBanner((prev) => (prev?.title === "You're out of credits" ? null : prev));
          clearOutOfCreditsSendStates();
        }
      }

      setLastDraftPreview({
        to: contact.email,
        subject: draftJson.subject,
        body: draftJson.body
      });
      setPendingSendDraft({
        key,
        name: contact.name,
        to: contact.email,
        subject: draftJson.subject,
        body: draftJson.body
      });
      window.dispatchEvent(new Event("quota-refresh"));
      setSendStates((prev) => ({ ...prev, [key]: "idle" }));
      log(`Draft ready for ${contact.name}. Confirm to send.`);
    } catch (error) {
      setSendStates((prev) => ({ ...prev, [key]: "error" }));
      const message = error instanceof Error ? error.message : "Failed to prepare draft.";
      setLastDraftError(message);
      pushToast("error", "Draft generation failed. Please retry.");
      log(`${message} (${contact.name})`);
    } finally {
      setActiveSendKey(null);
    }
  };

  const onSaveJob = (draft: { title: string; company: string; source_url: string; text: string }) => {
    const nextJob: JobDescriptionContext = {
      id: crypto.randomUUID(),
      title: draft.title,
      company: draft.company,
      source_url: draft.source_url || undefined,
      text: draft.text,
      updated_at: new Date().toISOString()
    };

    setActiveJob(nextJob);
    setRecentJobs((prev) => {
      const deduped = prev.filter((item) => item.text !== nextJob.text);
      return [nextJob, ...deduped].slice(0, 8);
    });
    setIsJobDrawerOpen(false);
    log("Job description set as active context");

    if (pendingContact) {
      const queuedContact = pendingContact;
      setPendingContact(null);
      void sendEmailForLead(queuedContact, nextJob);
    }
  };

  const onUseRecentJob = (job: JobDescriptionContext) => {
    setActiveJob({ ...job, updated_at: new Date().toISOString() });
    setIsJobDrawerOpen(false);
    log(`Activated recent JD: ${job.title || "Untitled role"}`);

    if (pendingContact) {
      const queuedContact = pendingContact;
      setPendingContact(null);
      void sendEmailForLead(queuedContact, job);
    }
  };

  const runDiscovery = async (submittedWebsiteInput: string, linkedinInput: string, source: "manual" | "history" = "manual") => {
    if (isLoading) return;

    const submittedWebsite = submittedWebsiteInput.trim();
    const finalLinkedin = linkedinInput.trim();
    const nextDomain = extractSearchDomain(submittedWebsite);
    let hadError = false;

    handleCompanyChange(nextDomain);

    setIsLoading(true);
    setResult(null);
    setRequestError(null);
    setActivityMessages([]);
    setRoleFilter("managers");
    setLastDraftError(null);
    log("Agent started");
    if (source === "history") {
      log("Running backend refresh because selected history item has no cached result");
    }

    try {
      const data = await streamLeads(submittedWebsite, finalLinkedin, {
        onProgress: (message) => log(message),
        onError: (message) => log(message)
      });

      setResult(data);
      if (data.error) {
        hadError = true;
        setRequestError(data.error);
      } else {
        log(`Received ${data.contacts.length} contacts`);
        log("Leads grouped by role");
      }

      if (data.warning) {
        log(data.warning);
      }

      await saveSearchHistory({
        website_url: submittedWebsite,
        linkedin_url: finalLinkedin || null,
        company_name: data.company || null,
        contacts_count: data.contacts.length || 0,
        status: data.error ? "error" : "success",
        error_message: data.error || null,
        result_snapshot: data
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch leads";
      hadError = true;
      setRequestError(message);
      log(message);

      await saveSearchHistory({
        website_url: submittedWebsite,
        linkedin_url: finalLinkedin || null,
        company_name: null,
        contacts_count: 0,
        status: "error",
        error_message: message,
        result_snapshot: null
      });
    } finally {
      setIsLoading(false);
      log(hadError ? "Agent finished with errors" : "Agent finished");
    }
  };

  const onSubmit = async () => {
    const submittedWebsite = website.trim();
    const finalLinkedin = autoDetectLinkedin ? guessLinkedinFromWebsite(submittedWebsite) || linkedin.trim() : linkedin.trim();
    await runDiscovery(submittedWebsite, finalLinkedin, "manual");
  };

  return (
    <main className="min-h-screen bg-hero-gradient">
      <Header />
      <ToastStack items={toasts} onDismiss={dismissToast} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">WarmReach</h1>
            <p className="mt-2 text-sm text-muted">
              Discover engineering leaders and hiring contacts from any company in seconds.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-20 lg:h-fit">
              <div className="space-y-4">
                <CompanyInputCard
                  website={website}
                  linkedin={linkedin}
                  autoDetectLinkedin={autoDetectLinkedin}
                  isLoading={isLoading}
                  onWebsiteChange={setWebsite}
                  onLinkedinChange={setLinkedin}
                  onAutoDetectChange={setAutoDetectLinkedin}
                  onSubmit={onSubmit}
                />
                <Card className="rounded-2xl p-3">
                  <button
                    type="button"
                    onClick={() => setIsHistoryDrawerOpen(true)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-black/30 px-3 py-2 text-sm text-muted transition hover:text-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Previous searches
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">{historyItems.length}</span>
                  </button>
                </Card>
                <AgentProgressTimeline
                  messages={activityMessages.map((m) => m.toLowerCase())}
                  isRunning={isLoading}
                  totalLeads={result?.contacts.length || 0}
                />
              </div>
            </div>

            <div className="space-y-6">
              {creditBanner ? (
                <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-amber-200">{creditBanner.title}</p>
                      <p className="mt-1 text-sm text-amber-300">{creditBanner.detail}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={creditBanner.ctaHref}
                        className="rounded-lg border border-transparent bg-gradient-to-r from-accent to-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
                      >
                        {creditBanner.ctaLabel}
                      </Link>
                      <Link
                        href="/profile#credits"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
                      >
                        View usage details
                      </Link>
                    </div>
                  </div>
                </Card>
              ) : null}

              {!isLoading && requestError && (
                <Card className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {requestError}
                </Card>
              )}

              {!isStateReady && !isLoading && (
                <Card className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
                  Loading your workspace...
                </Card>
              )}

              {!result && !isLoading && isStateReady && <EmptyState mode="initial" />}

              {isLoading && <LoadingSkeleton />}

              {!isLoading && result && isStateReady && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">
                  {result.warning && (
                    <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                      {(() => {
                        const warning = normalizeWarningMessage(result.warning);
                        if (!warning) return null;
                        return (
                          <div>
                            <p className="font-medium">{warning.title}</p>
                            <p className="mt-1 text-amber-300">{warning.detail}</p>
                          </div>
                        );
                      })()}
                    </Card>
                  )}
                  {lastDraftError ? (
                    <Card className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      <p className="font-medium">Draft generation failed</p>
                      <p className="mt-1 text-red-300">{lastDraftError}</p>
                    </Card>
                  ) : null}
                  {lastDraftPreview ? (
                    <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                      <p className="text-sm font-semibold text-emerald-200">Latest Generated Draft</p>
                      <p className="mt-1 text-xs text-emerald-300">To: {lastDraftPreview.to}</p>
                      <p className="mt-2 text-sm text-foreground">
                        <span className="font-semibold">Subject:</span> {lastDraftPreview.subject}
                      </p>
                      <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg border border-emerald-500/20 bg-black/30 p-3 text-xs text-muted">
                        {lastDraftPreview.body}
                      </pre>
                    </Card>
                  ) : null}

                  <CompanySummaryCard data={result} />
                  <JobContextBar
                    activeJob={activeJob}
                    onOpen={() => setIsJobDrawerOpen(true)}
                    onClear={() => setActiveJob(null)}
                  />
                  <ActionBar
                    contacts={filteredContacts}
                    unlockedCount={Object.keys(unlockedEmails).length}
                    isGenerating={Boolean(activeSendKey)}
                  />

                  {(result.contacts || []).length ? (
                    <LeadList
                      contacts={filteredContacts}
                      roleFilter={roleFilter}
                      roleCounts={roleCounts}
                      onRoleChange={setRoleFilter}
                      sendStates={sendStates}
                      activeSendKey={activeSendKey}
                      unlockedEmails={unlockedEmails}
                      onSendEmail={(contact) => {
                        void sendEmailForLead(contact);
                      }}
                    />
                  ) : (
                    <EmptyState mode="no_results" />
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      <JobDescriptionDrawer
        open={isJobDrawerOpen}
        activeJob={activeJob}
        recentJobs={recentJobs}
        onClose={() => {
          setIsJobDrawerOpen(false);
          setPendingContact(null);
        }}
        onSave={onSaveJob}
        onUseRecent={onUseRecentJob}
      />

      <PreviousCompanySearchesDrawer
        open={isHistoryDrawerOpen}
        items={historyItems}
        isLoading={isHistoryLoading}
        error={historyError}
        deletingId={historyDeleteId}
        isClearing={isHistoryClearing}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onLoad={onLoadHistoryItem}
        onDelete={onDeleteHistoryItem}
        onClearAll={onClearSearchHistory}
      />

      {pendingSendDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-2xl rounded-2xl border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-foreground">Review Draft Before Send</p>
                <p className="mt-1 text-xs text-muted">
                  Recipient: {pendingSendDraft.name} ({pendingSendDraft.to})
                </p>
              </div>
              <button
                onClick={() => setPendingSendDraft(null)}
                className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-border bg-black/30 p-3">
                <p className="text-xs uppercase tracking-wider text-muted">Subject</p>
                <p className="mt-1 text-sm text-foreground">{pendingSendDraft.subject}</p>
              </div>
              <div className="rounded-lg border border-border bg-black/30 p-3">
                <p className="text-xs uppercase tracking-wider text-muted">Body</p>
                <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-foreground">
                  {pendingSendDraft.body}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingSendDraft(null)}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const draft = pendingSendDraft;
                  if (!draft) return;
                  setUnlockedEmails((prev) => ({ ...prev, [draft.key]: true }));
                  openCompose(draft.to, draft.subject, draft.body);
                  await navigator.clipboard.writeText(draft.body).catch(() => undefined);
                  setSendStates((prev) => ({ ...prev, [draft.key]: "sent" }));
                  log(`Opened compose for ${draft.name}.`);
                  setPendingSendDraft(null);
                  setTimeout(() => {
                    setSendStates((prev) => ({ ...prev, [draft.key]: "idle" }));
                  }, 4000);
                }}
                className="rounded-lg border border-transparent bg-gradient-to-r from-accent to-violet-600 px-3 py-2 text-xs font-medium text-white hover:brightness-110"
              >
                Confirm Send
              </button>
            </div>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
