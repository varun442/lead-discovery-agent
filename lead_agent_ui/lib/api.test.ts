import { fetchLeads, streamLeads } from "@/lib/api";
import type { LeadResponse } from "@/lib/types";

class MockEventSource {
  static instances: MockEventSource[] = [];

  public onerror: ((this: EventSource, ev: Event) => unknown) | null = null;
  public close = vi.fn();
  public url: string;
  private listeners = new Map<string, Array<(event: MessageEvent | { data?: string }) => void>>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, callback: (event: MessageEvent | { data?: string }) => void): void {
    const existing = this.listeners.get(type) || [];
    this.listeners.set(type, [...existing, callback]);
  }

  emit(type: string, payload: unknown): void {
    const callbacks = this.listeners.get(type) || [];
    const encoded = JSON.stringify(payload);
    const event =
      typeof MessageEvent !== "undefined"
        ? new MessageEvent(type, { data: encoded })
        : ({ data: encoded } as { data: string });
    for (const cb of callbacks) {
      cb(event);
    }
  }

  emitRaw(type: string, rawData: string): void {
    const callbacks = this.listeners.get(type) || [];
    for (const cb of callbacks) {
      cb({ data: rawData });
    }
  }
}

describe("lib/api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    MockEventSource.instances = [];
    (globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
  });

  it("fetchLeads returns parsed JSON on success", async () => {
    const payload: LeadResponse = {
      company: "Stripe",
      website: "https://stripe.com",
      email_domain: "stripe.com",
      linkedin_company: "https://linkedin.com/company/stripe",
      contacts: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    await expect(fetchLeads("https://stripe.com", "https://linkedin.com/company/stripe")).resolves.toEqual(payload);
  });

  it("fetchLeads throws with backend error text when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "upstream failed",
    } as Response);

    await expect(fetchLeads("https://stripe.com", "https://linkedin.com/company/stripe")).rejects.toThrow(
      "Backend request failed (500): upstream failed"
    );
  });

  it("fetchLeads aborts on timeout", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_, init) => {
      const signal = (init as RequestInit).signal as AbortSignal;
      return new Promise((_, reject) => {
        signal.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      }) as Promise<Response>;
    });

    const pending = fetchLeads("https://stripe.com", "https://linkedin.com/company/stripe");
    const assertion = expect(pending).rejects.toThrow("aborted");
    await vi.advanceTimersByTimeAsync(91000);
    await assertion;
    vi.useRealTimers();
  });

  it("streamLeads resolves on result event and forwards progress", async () => {
    const onProgress = vi.fn();
    const pending = streamLeads("https://stripe.com", "https://linkedin.com/company/stripe", { onProgress });

    const source = MockEventSource.instances[0];
    expect(source.url).toContain("/api/leads/stream?");
    expect(source.url).toContain("website=");
    expect(source.url).toContain("linkedin=");

    source.emit("progress", { message: "step 1" });
    source.emit("result", {
      company: "Stripe",
      website: "https://stripe.com",
      email_domain: "stripe.com",
      linkedin_company: "https://linkedin.com/company/stripe",
      contacts: [],
    });

    await expect(pending).resolves.toEqual({
      company: "Stripe",
      website: "https://stripe.com",
      email_domain: "stripe.com",
      linkedin_company: "https://linkedin.com/company/stripe",
      contacts: [],
    });
    expect(onProgress).toHaveBeenCalledWith("step 1");
    expect(source.close).toHaveBeenCalled();
  });

  it("streamLeads rejects on structured error event", async () => {
    const onError = vi.fn();
    const pending = streamLeads("https://stripe.com", "https://linkedin.com/company/stripe", { onError });

    const source = MockEventSource.instances[0];
    source.emit("error", { message: "stream broken" });

    await expect(pending).rejects.toThrow("stream broken");
    expect(onError).toHaveBeenCalledWith("stream broken");
  });

  it("streamLeads ignores malformed progress payload", async () => {
    const onProgress = vi.fn();
    const pending = streamLeads("https://stripe.com", "https://linkedin.com/company/stripe", { onProgress });

    const source = MockEventSource.instances[0];
    source.emitRaw("progress", "{not-json");
    source.emit("result", {
      company: "Stripe",
      website: "https://stripe.com",
      email_domain: "stripe.com",
      linkedin_company: "https://linkedin.com/company/stripe",
      contacts: [],
    });

    await expect(pending).resolves.toMatchObject({ company: "Stripe" });
    expect(onProgress).not.toHaveBeenCalled();
  });
});
