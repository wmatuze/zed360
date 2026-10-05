import type { BusinessDashboard } from "@zed360/contracts";

type DashboardBusiness = BusinessDashboard["businesses"][number];

export type AttentionItem = {
  key: string;
  // "urgent" affects customers now; "setup" improves the profile; "info" needs
  // no action from the business.
  tone: "urgent" | "setup" | "info";
  title: string;
  detail: string;
  href: string | null;
  action: string | null;
};

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export function attentionItems(business: DashboardBusiness): AttentionItem[] {
  const items: AttentionItem[] = [];
  const base = `/business/${business.id}`;
  const approved =
    business.status === "active" && business.reviewStatus === "approved";
  const canManage = business.role !== "staff" && business.status !== "closed";

  if (business.reviewStatus === "changes_requested")
    items.push({
      key: "corrections",
      tone: "urgent",
      title: "Zed360 asked for corrections",
      detail: "Your business stays hidden until the corrections are sent.",
      href: "/business/account",
      action: "See what to fix",
    });
  if (business.reviewStatus === "pending")
    items.push({
      key: "pending-review",
      tone: "info",
      title: "Awaiting Zed360 review",
      detail: "Requests and your public profile open once you are approved.",
      href: null,
      action: null,
    });

  if (business.metrics.awaitingResponse > 0)
    items.push({
      key: "awaiting-response",
      tone: "urgent",
      title: `${plural(business.metrics.awaitingResponse, "request is", "requests are")} waiting for your response`,
      detail: "Customers choose from the businesses that answer first.",
      href: "/business/requests",
      action: "Respond now",
    });

  if (approved && business.presence.availabilityFreshness !== "current")
    items.push({
      key: "availability",
      tone: "urgent",
      title: "Confirm your availability",
      detail:
        business.presence.availabilityFreshness === "stale"
          ? "It is more than 7 days old, so customers see it as not recently confirmed."
          : "Customers cannot see whether you can help right now.",
      href: `${base}/presence`,
      action: "Update availability",
    });

  if (approved && business.presence.profileFreshness !== "current")
    items.push({
      key: "profile-confirmation",
      tone: "setup",
      title: "Confirm your profile is still correct",
      detail:
        "A recent confirmation date shows customers the details are current.",
      href: `${base}/presence`,
      action: "Confirm profile",
    });

  if (canManage) {
    if (!business.setup.hasAvailableService)
      items.push({
        key: "service",
        tone: "urgent",
        title: "Add a service customers can ask for",
        detail: "Requests are matched to businesses by their services.",
        href: `${base}/services`,
        action: "Add a service",
      });
    if (business.setup.hasAvailableService && !business.setup.hasCoverage)
      items.push({
        key: "coverage",
        tone: "urgent",
        title: "Say where and how you serve customers",
        detail: "Without coverage, requests from your area cannot reach you.",
        href: `${base}/coverage`,
        action: "Set coverage",
      });
    if (business.metrics.locationsWithoutHours > 0)
      items.push({
        key: "hours",
        tone: "setup",
        title: `${plural(business.metrics.locationsWithoutHours, "location has", "locations have")} no opening hours`,
        detail: "Customers see “Hours not added” instead of open or closed.",
        href: `${base}/hours`,
        action: "Add hours",
      });
    if (business.metrics.locationsWithoutPin > 0)
      items.push({
        key: "map-pin",
        tone: "setup",
        title: `${plural(business.metrics.locationsWithoutPin, "location has", "locations have")} no map pin`,
        detail:
          "A pin shows a map and exact directions. Skip this if customers do not visit you.",
        href: `${base}/locations`,
        action: "Set a pin",
      });
    if (!business.setup.hasApprovedMedia)
      items.push({
        key: "media",
        tone: "setup",
        title: "Add a logo or photos",
        detail: "Profiles with real photos are easier for customers to trust.",
        href: `${base}/catalog`,
        action: "Add images",
      });
  }

  if (business.metrics.pendingMedia > 0)
    items.push({
      key: "pending-media",
      tone: "info",
      title: `${plural(business.metrics.pendingMedia, "image is", "images are")} awaiting Zed360 review`,
      detail: "They appear on your profile once approved.",
      href: null,
      action: null,
    });

  const order = { urgent: 0, setup: 1, info: 2 };
  return items.sort((a, b) => order[a.tone] - order[b.tone]);
}

export function responseTimeLabel(minutes: number | null) {
  if (minutes === null) return null;
  if (minutes < 1) return "Under a minute";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 60 * 24) {
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  const days = Math.round((minutes / (60 * 24)) * 10) / 10;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export function percentage(part: number, whole: number) {
  return whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : null;
}
