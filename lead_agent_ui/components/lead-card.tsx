import { Copy, ExternalLink, Linkedin, Mail, SendHorizonal } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { confidenceDisplay, confidenceLabel } from "@/lib/lead-utils";
import { getSendButtonLabel, type LeadSendState } from "@/lib/outreach-credit-ui";
import type { Contact } from "@/lib/types";

interface LeadCardProps {
  contact: Contact;
  index: number;
  sendState: LeadSendState;
  onSendEmail: (contact: Contact) => void;
  disableSend: boolean;
  isEmailUnlocked: boolean;
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function confidenceClasses(kind: ReturnType<typeof confidenceLabel>): string {
  if (kind === "verified") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (kind === "high") return "border-amber-500/30 bg-amber-500/15 text-amber-300";
  return "border-red-500/30 bg-red-500/10 text-red-300";
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Email hidden";
  if (local.length <= 2) return `${local[0] || "*"}*@${domain}`;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

export function LeadCard({ contact, index, sendState, onSendEmail, disableSend, isEmailUnlocked }: LeadCardProps) {
  const [copied, setCopied] = useState(false);
  const confidence = confidenceLabel(contact.email_confidence);

  const onCopy = async () => {
    if (!contact.email) return;
    await navigator.clipboard.writeText(contact.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const sendButtonLabel = getSendButtonLabel(sendState);

  const displayedEmail = contact.email ? (isEmailUnlocked ? contact.email : maskEmail(contact.email)) : "No email found";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.02 }}>
      <Card className="rounded-2xl p-4 transition hover:border-zinc-600">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-black/50 text-sm font-semibold">
              {initials(contact.name)}
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-lg font-semibold text-foreground">{contact.name}</h4>
              <p className="text-sm text-muted">{contact.title || "Title unavailable"}</p>
              <a href={contact.linkedin} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
            </div>
          </div>

          <div className="text-left lg:text-right">
            <p className="inline-flex items-center gap-1 text-sm text-foreground">
              <Mail className="h-3.5 w-3.5" /> {displayedEmail}
            </p>
            <div className="mt-2 flex lg:justify-end">
              <span
                title={
                  confidence === "verified"
                    ? "Found from public source"
                    : confidence === "high"
                      ? "Based on company email pattern"
                      : "Weak pattern match"
                }
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${confidenceClasses(confidence)}`}
              >
                {confidenceDisplay(contact.email_confidence)}
              </span>
            </div>
            <div className="mt-3 flex gap-2 lg:justify-end">
              <button
                onClick={() => {
                  if (sendState === "out_of_credits") {
                    window.location.href = "/profile#credits";
                    return;
                  }
                  onSendEmail(contact);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-60"
                disabled={!contact.email || sendState === "sending" || disableSend}
                title={
                  !contact.email
                    ? "No email available for this lead"
                    : sendState === "out_of_credits"
                      ? "Out of credits. Open Credits & Plans to continue."
                      : "Generate and send personalized email"
                }
              >
                <SendHorizonal className="h-3.5 w-3.5" /> {sendButtonLabel}
              </button>
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
                disabled={!contact.email || !isEmailUnlocked}
                title={!isEmailUnlocked ? "Email unlocks after generating draft for this lead" : "Copy email"}
              >
                <Copy className="h-3.5 w-3.5" /> {copied ? "Email copied!" : "Copy Email"}
              </button>
              <a href={contact.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" /> View Profile
              </a>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
