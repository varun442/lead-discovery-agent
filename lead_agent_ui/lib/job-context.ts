import type { JobDescriptionContext } from "@/lib/types";

export interface JobContextDraftInput {
  title: string;
  company: string;
  source_url: string;
  text: string;
}

export interface JobContextValidationResult {
  ok: boolean;
  error: string | null;
  value: JobContextDraftInput;
}

const MIN_DESCRIPTION_LENGTH = 40;

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateJobContextDraft(input: JobContextDraftInput): JobContextValidationResult {
  const value: JobContextDraftInput = {
    title: toTrimmedString(input.title),
    company: toTrimmedString(input.company),
    source_url: toTrimmedString(input.source_url),
    text: toTrimmedString(input.text)
  };

  if (!value.title) {
    return { ok: false, error: "Job title is required.", value };
  }

  if (!value.company) {
    return { ok: false, error: "Company is required.", value };
  }

  if (!value.source_url) {
    return { ok: false, error: "Job URL is required.", value };
  }

  if (!isValidHttpUrl(value.source_url)) {
    return { ok: false, error: "Enter a valid job URL starting with http:// or https://.", value };
  }

  if (!value.text || value.text.length < MIN_DESCRIPTION_LENGTH) {
    return { ok: false, error: "Paste a fuller job description (at least 40 characters).", value };
  }

  return { ok: true, error: null, value };
}

export function isJobContextComplete(job: JobDescriptionContext | null | undefined): boolean {
  if (!job) return false;
  const result = validateJobContextDraft({
    title: job.title || "",
    company: job.company || "",
    source_url: job.source_url || "",
    text: job.text || ""
  });
  return result.ok;
}
