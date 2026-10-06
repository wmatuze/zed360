import type { BusinessActivityEvent } from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export function activityUrl(slug: string) {
  return `${apiUrl}/businesses/${encodeURIComponent(slug)}/activity`;
}

// A day in Zambia, so a visitor is counted once per calendar day there.
export function zambiaDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Adds one to a business's activity count. Only the business and the kind of
 * activity are sent; nothing identifies the visitor. Counting must never get
 * in the way of the customer, so every failure is ignored.
 */
export function trackActivity(slug: string, event: BusinessActivityEvent) {
  try {
    void fetch(activityUrl(slug), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event }),
      // Lets the request finish when the tap opens WhatsApp or another site.
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Ignored on purpose.
  }
}
