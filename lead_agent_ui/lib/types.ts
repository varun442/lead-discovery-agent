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

export type CompanySearchStatus = "success" | "error";

export interface CompanySearchHistoryItem {
  id: string;
  user_id: string;
  search_domain: string;
  website_url: string;
  linkedin_url: string | null;
  company_name: string | null;
  contacts_count: number;
  status: CompanySearchStatus;
  error_message: string | null;
  last_searched_at: string;
  created_at: string;
  updated_at: string;
}
