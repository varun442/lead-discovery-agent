import type { Contact, EmailConfidence } from "@/lib/types";

export type RoleFilter = "all" | "engineers" | "managers" | "recruiters";
export type ConfidenceFilter = "all" | "verified" | "high" | "low";

export function classifyRole(contact: Contact): Exclude<RoleFilter, "all"> {
  const title = (contact.title || "").toLowerCase();
  if (/(recruit|hiring|talent|acquisition)/.test(title)) return "recruiters";
  if (/(manager|director|head|lead|vp|chief|cto)/.test(title)) return "managers";
  return "engineers";
}

export function confidenceLabel(conf: EmailConfidence): "verified" | "high" | "low" {
  if (conf === "high") return "verified";
  if (conf === "inferred") return "high";
  return "low";
}

export function confidenceDisplay(conf: EmailConfidence): string {
  const mapped = confidenceLabel(conf);
  if (mapped === "verified") return "Verified";
  if (mapped === "high") return "High Confidence";
  return "Low Confidence";
}

export function filterContacts(
  contacts: Contact[],
  roleFilter: RoleFilter,
  confidenceFilter: ConfidenceFilter
): Contact[] {
  return contacts.filter((contact) => {
    const roleOk = roleFilter === "all" ? true : classifyRole(contact) === roleFilter;
    const conf = confidenceLabel(contact.email_confidence);
    const confidenceOk = confidenceFilter === "all" ? true : conf === confidenceFilter;
    return roleOk && confidenceOk;
  });
}

export function roleDisplay(role: Exclude<RoleFilter, "all">): string {
  if (role === "engineers") return "Engineers";
  if (role === "managers") return "Managers";
  return "Recruiters";
}
