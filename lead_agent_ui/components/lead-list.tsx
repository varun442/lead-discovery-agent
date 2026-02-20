import { Briefcase, Code2, Users } from "lucide-react";

import { LeadCard } from "@/components/lead-card";
import { roleDisplay, type RoleFilter } from "@/lib/lead-utils";
import type { LeadSendState } from "@/lib/outreach-credit-ui";
import type { Contact } from "@/lib/types";

interface LeadListProps {
  contacts: Contact[];
  roleFilter: RoleFilter;
  roleCounts: Record<RoleFilter, number>;
  onRoleChange: (value: RoleFilter) => void;
  sendStates: Record<string, LeadSendState>;
  onSendEmail: (contact: Contact) => void;
  activeSendKey: string | null;
  unlockedEmails: Record<string, true>;
}

function contactKey(contact: Contact): string {
  return contact.linkedin || contact.email || contact.name;
}

const roleIcons: Record<RoleFilter, React.ReactNode> = {
  managers: <Briefcase className="h-4 w-4" />,
  engineers: <Code2 className="h-4 w-4" />,
  recruiters: <Users className="h-4 w-4" />
};

export function LeadList({
  contacts,
  roleFilter,
  roleCounts,
  onRoleChange,
  sendStates,
  onSendEmail,
  activeSendKey,
  unlockedEmails
}: LeadListProps) {
  let index = 0;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted">{roleIcons[roleFilter]}</span>
            <h3 className="text-xl font-semibold text-foreground">{roleDisplay(roleFilter)}</h3>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{roleCounts[roleFilter]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["managers", "engineers", "recruiters"] as RoleFilter[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => onRoleChange(role)}
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs transition ${
                  roleFilter === role
                    ? "border-accent bg-accent/20 text-foreground"
                    : "border-border bg-black/20 text-muted hover:text-foreground"
                }`}
              >
                <span className="text-muted">{roleIcons[role]}</span>
                <span>{roleDisplay(role)}</span>
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[11px]">{roleCounts[role]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {contacts.length ? (
            contacts.map((contact) => {
              index += 1;
              return (
                <LeadCard
                  key={`${roleFilter}-${contact.linkedin}-${index}`}
                  contact={contact}
                  index={index}
                  onSendEmail={onSendEmail}
                  sendState={sendStates[contactKey(contact)] || "idle"}
                  disableSend={Boolean(activeSendKey && activeSendKey !== contactKey(contact))}
                  isEmailUnlocked={Boolean(unlockedEmails[contactKey(contact)])}
                />
              );
            })
          ) : (
            <div className="rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted">
              No contacts in {roleDisplay(roleFilter).toLowerCase()} for this search. Select another role tab.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
