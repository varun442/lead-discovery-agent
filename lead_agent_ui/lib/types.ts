export type EmailConfidence = "high" | "inferred" | "unknown";

export interface Contact {
  name: string;
  title: string;
  linkedin: string;
  email: string;
  email_confidence: EmailConfidence;
}

export interface LeadResponse {
  company: string;
  website: string;
  email_domain: string;
  linkedin_company: string;
  company_logo?: string;
  industry?: string;
  location?: string;
  contacts: Contact[];
  warning?: string;
  error?: string;
}

export interface JobDescriptionContext {
  id: string;
  title: string;
  company: string;
  text: string;
  source_url?: string;
  updated_at: string;
}
