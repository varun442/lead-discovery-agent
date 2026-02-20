import type { CompanySearchStatus, LeadResponse } from "@/lib/types";

export interface CompanySearchHistoryInput {
  website_url: string;
  linkedin_url?: string | null;
  company_name?: string | null;
  contacts_count?: number | null;
  status?: CompanySearchStatus | null;
  error_message?: string | null;
  result_snapshot?: LeadResponse | null;
}

export interface NormalizedCompanySearchHistoryPayload {
  search_domain: string;
  website_url: string;
  linkedin_url: string | null;
  company_name: string | null;
  contacts_count: number;
  status: CompanySearchStatus;
  error_message: string | null;
  result_snapshot: LeadResponse | null;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toEmailConfidence(value: unknown): "high" | "inferred" | "unknown" {
  if (value === "high" || value === "inferred" || value === "unknown") return value;
  return "unknown";
}

export function normalizeResultSnapshot(input: unknown): LeadResponse | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const contactsRaw = Array.isArray(raw.contacts) ? raw.contacts : [];

  const contacts = contactsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const contact = item as Record<string, unknown>;
      return {
        name: toStringOrEmpty(contact.name),
        title: toStringOrEmpty(contact.title),
        linkedin: toStringOrEmpty(contact.linkedin),
        email: toStringOrEmpty(contact.email),
        email_confidence: toEmailConfidence(contact.email_confidence)
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    company: toStringOrEmpty(raw.company),
    website: toStringOrEmpty(raw.website),
    email_domain: toStringOrEmpty(raw.email_domain),
    linkedin_company: toStringOrEmpty(raw.linkedin_company),
    company_logo: toStringOrNull(raw.company_logo) || undefined,
    industry: toStringOrNull(raw.industry) || undefined,
    location: toStringOrNull(raw.location) || undefined,
    contacts,
    warning: toStringOrNull(raw.warning) || undefined,
    error: toStringOrNull(raw.error) || undefined
  };
}

export function extractSearchDomain(website: string): string {
  const trimmed = website.trim().toLowerCase();
  if (!trimmed) return "";

  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^www\./, "").trim();
    if (host) return host;
  } catch {
    // Fallback handled below.
  }

  return trimmed.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || trimmed;
}

export function normalizeHistoryPayload(input: CompanySearchHistoryInput): NormalizedCompanySearchHistoryPayload {
  const website = input.website_url.trim();
  const linkedin = input.linkedin_url?.trim() || null;
  const company = input.company_name?.trim() || null;
  const status: CompanySearchStatus = input.status === "error" ? "error" : "success";
  const contactsCount = Number.isFinite(input.contacts_count) ? Math.max(0, Math.floor(Number(input.contacts_count))) : 0;
  const errorMessage = status === "error" ? input.error_message?.trim() || null : null;
  const searchDomain = extractSearchDomain(website);
  const resultSnapshot = normalizeResultSnapshot(input.result_snapshot);

  return {
    search_domain: searchDomain,
    website_url: website,
    linkedin_url: linkedin,
    company_name: company,
    contacts_count: contactsCount,
    status,
    error_message: errorMessage,
    result_snapshot: resultSnapshot
  };
}

export function formatHistoryTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
