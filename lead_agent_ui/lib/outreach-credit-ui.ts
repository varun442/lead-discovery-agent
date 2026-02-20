export type ToastKind = "error" | "info" | "success";

export type DraftErrorCode = "OUT_OF_CREDITS" | "DAILY_LIMIT_REACHED" | "UNKNOWN";
export type LeadSendState = "idle" | "sending" | "sent" | "error" | "out_of_credits";

export interface DraftFailurePayload {
  error?: string;
  error_code?: DraftErrorCode;
  request_id?: string;
  credits?: {
    charged?: number;
    balance?: number;
    event_type?: string;
  };
  quota?: {
    daily_limit?: number;
    used_today?: number;
    remaining_today?: number;
    reset_at_utc?: string;
  };
}

export interface CreditBannerState {
  title: string;
  detail: string;
  ctaHref: string;
  ctaLabel: string;
}

export interface DraftFailureUi {
  sendState: "error" | "out_of_credits";
  isOutOfCredits: boolean;
  toast: { kind: ToastKind; message: string };
  banner: CreditBannerState | null;
  detailMessage: string;
}

function withRequestId(message: string, requestId?: string): string {
  if (!requestId) return message;
  return `${message} (request: ${requestId})`;
}

export function outOfCreditsBanner(): CreditBannerState {
  return {
    title: "You're out of credits",
    detail: "Add credits to continue generating personalized outreach emails.",
    ctaHref: "/profile#credits",
    ctaLabel: "Buy credits"
  };
}

function dailyLimitBanner(resetAtUtc?: string): CreditBannerState {
  const resetText = resetAtUtc ? ` Resets at ${new Date(resetAtUtc).toLocaleString()}.` : "";
  return {
    title: "Daily draft limit reached",
    detail: `You reached today's base-draft limit.${resetText}`,
    ctaHref: "/profile#credits",
    ctaLabel: "View usage details"
  };
}

export function mapDraftFailure(responseStatus: number, payload: DraftFailurePayload): DraftFailureUi {
  const requestId = payload.request_id;
  if (responseStatus === 402 || payload.error_code === "OUT_OF_CREDITS") {
    const message = payload.error || "Insufficient credits.";
    return {
      sendState: "out_of_credits",
      isOutOfCredits: true,
      toast: { kind: "error", message: "Out of credits. Add credits to continue." },
      banner: outOfCreditsBanner(),
      detailMessage: withRequestId(message, requestId)
    };
  }

  if (responseStatus === 429 || payload.error_code === "DAILY_LIMIT_REACHED") {
    const message = payload.error || "Daily draft limit reached.";
    return {
      sendState: "error",
      isOutOfCredits: false,
      toast: { kind: "info", message: "Daily draft limit reached. Try again after reset." },
      banner: dailyLimitBanner(payload.quota?.reset_at_utc),
      detailMessage: withRequestId(message, requestId)
    };
  }

  const message = payload.error || "Failed to generate email draft.";
  return {
    sendState: "error",
    isOutOfCredits: false,
    toast: { kind: "error", message: "Draft generation failed. Please retry." },
    banner: null,
    detailMessage: withRequestId(message, requestId)
  };
}

export function getSendButtonLabel(sendState: LeadSendState): string {
  if (sendState === "sending") return "Sending...";
  if (sendState === "sent") return "Sent";
  if (sendState === "out_of_credits") return "Out of credits";
  if (sendState === "error") return "Retry Send";
  return "Send AI Email";
}

export function toBalance(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}
