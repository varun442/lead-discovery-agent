import type { LeadResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_LEAD_API_URL || "http://127.0.0.1:8000";

export async function fetchLeads(website: string, linkedin: string): Promise<LeadResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ website, linkedin }),
      cache: "no-store",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backend request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as LeadResponse;
}

interface StreamCallbacks {
  onProgress?: (message: string) => void;
  onError?: (message: string) => void;
}

export function streamLeads(
  website: string,
  linkedin: string,
  callbacks: StreamCallbacks = {}
): Promise<LeadResponse> {
  const params = new URLSearchParams({
    website,
    linkedin
  });
  const url = `${API_BASE_URL}/api/leads/stream?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const source = new EventSource(url);
    let settled = false;

    source.addEventListener("progress", (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as { message?: string };
        if (parsed.message && callbacks.onProgress) callbacks.onProgress(parsed.message);
      } catch {
        // Ignore malformed progress payloads.
      }
    });

    source.addEventListener("result", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as LeadResponse;
        settled = true;
        source.close();
        resolve(payload);
      } catch (err) {
        settled = true;
        source.close();
        reject(err);
      }
    });

    source.addEventListener("error", (event) => {
      const message =
        event instanceof MessageEvent && event.data
          ? (() => {
              try {
                return (JSON.parse(event.data) as { message?: string }).message || "Streaming failed";
              } catch {
                return "Streaming failed";
              }
            })()
          : "Streaming failed";

      if (callbacks.onError) callbacks.onError(message);
      if (!settled) {
        settled = true;
        source.close();
        reject(new Error(message));
      }
    });

    source.onerror = () => {
      if (!settled) {
        settled = true;
        source.close();
        reject(new Error("Unable to connect to live stream"));
      }
    };
  });
}
