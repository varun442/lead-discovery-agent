import type { CompanySearchStatus } from "@/lib/types";

export interface CompanySearchHistoryInput {
  website_url: string;
  linkedin_url?: string | null;
  company_name?: string | null;
  contacts_count?: number | null;
  status?: CompanySearchStatus | null;
  error_message?: string | null;
}

export interface NormalizedCompanySearchHistoryPayload {
  search_domain: string;
  website_url: string;
  linkedin_url: string | null;
  company_name: string | null;
  contacts_count: number;
  status: CompanySearchStatus;
  error_message: string | null;
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

  return {
    search_domain: searchDomain,
    website_url: website,
    linkedin_url: linkedin,
    company_name: company,
    contacts_count: contactsCount,
    status,
    error_message: errorMessage
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
