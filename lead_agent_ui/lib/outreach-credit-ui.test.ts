import { describe, expect, it } from "vitest";

import { getSendButtonLabel, mapDraftFailure, outOfCreditsBanner, toBalance } from "@/lib/outreach-credit-ui";

describe("outreach-credit-ui", () => {
  it("maps out-of-credits failures to out_of_credits send state", () => {
    const mapped = mapDraftFailure(402, {
      error: "Insufficient credits.",
      error_code: "OUT_OF_CREDITS",
      request_id: "abc-123"
    });

    expect(mapped.sendState).toBe("out_of_credits");
    expect(mapped.isOutOfCredits).toBe(true);
    expect(mapped.banner).toEqual(outOfCreditsBanner());
    expect(mapped.detailMessage).toContain("Insufficient credits.");
    expect(mapped.detailMessage).toContain("abc-123");
  });

  it("maps daily limit failures to info toast + error state", () => {
    const mapped = mapDraftFailure(429, {
      error: "Daily base-draft limit reached (10).",
      error_code: "DAILY_LIMIT_REACHED",
      quota: {
        reset_at_utc: "2026-02-20T00:00:00.000Z"
      }
    });

    expect(mapped.sendState).toBe("error");
    expect(mapped.isOutOfCredits).toBe(false);
    expect(mapped.toast.kind).toBe("info");
    expect(mapped.banner?.title).toContain("Daily draft limit reached");
  });

  it("maps unknown failures to retry send error state", () => {
    const mapped = mapDraftFailure(500, {
      error: "Something failed"
    });

    expect(mapped.sendState).toBe("error");
    expect(mapped.isOutOfCredits).toBe(false);
    expect(mapped.banner).toBeNull();
    expect(mapped.toast.kind).toBe("error");
  });

  it("returns expected send button labels", () => {
    expect(getSendButtonLabel("idle")).toBe("Send AI Email");
    expect(getSendButtonLabel("sending")).toBe("Sending...");
    expect(getSendButtonLabel("sent")).toBe("Sent");
    expect(getSendButtonLabel("error")).toBe("Retry Send");
    expect(getSendButtonLabel("out_of_credits")).toBe("Out of credits");
  });

  it("normalizes credit balance into non-NaN number", () => {
    expect(toBalance(2)).toBe(2);
    expect(toBalance("3")).toBe(3);
    expect(toBalance("not-a-number")).toBe(0);
    expect(toBalance(undefined)).toBe(0);
  });
});
