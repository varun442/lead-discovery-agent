import { extractSearchDomain } from "@/lib/company-search-history";
import type { LeadResponse } from "@/lib/types";

export function normalizeDomainValue(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

export function shouldResetOnCompanyChange(previousDomain: string | null | undefined, nextDomain: string | null | undefined): boolean {
  const prev = normalizeDomainValue(previousDomain);
  const next = normalizeDomainValue(nextDomain);
  return Boolean(prev && next && prev !== next);
}

export function resolveSearchDomain(input: {
  searchDomain?: string | null;
  result?: LeadResponse | null;
  website?: string | null;
}): string {
  const explicitDomain = normalizeDomainValue(input.searchDomain);
  if (explicitDomain) return explicitDomain;

  const resultEmailDomain = normalizeDomainValue(input.result?.email_domain);
  if (resultEmailDomain) return resultEmailDomain;

  const websiteCandidate = (input.result?.website || input.website || "").trim();
  if (!websiteCandidate) return "";
  return normalizeDomainValue(extractSearchDomain(websiteCandidate));
}
