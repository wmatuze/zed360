import type {
  PublicBusinessDirectory,
  PublicBusinessSort,
} from "@zed360/contracts";

type Business = PublicBusinessDirectory["businesses"][number];

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-ZM", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lusaka",
  }).format(new Date(value));

// The specific check is named so a contact check is never read as proof of
// registration.
export function verificationLabel(trust: Business["trust"]) {
  if (trust.registrationVerified) return "Registration verified";
  if (trust.contactVerified) return "Contact verified";
  return null;
}

export type MeritSection = {
  sort: Exclude<PublicBusinessSort, "recently_confirmed">;
  title: string;
  /** One short line under the title saying what the section lists. */
  rule: string;
  /** Why this particular business is here, or null if it should be hidden. */
  reason: (business: Business) => string | null;
};

export const meritSections: MeritSection[] = [
  {
    sort: "top_rated",
    title: "Top rated",
    rule: "The highest-rated businesses, based on verified customer reviews.",
    reason: ({ reviewSummary }) =>
      reviewSummary.reviewCount > 0 && reviewSummary.averageRating !== null
        ? `★ ${reviewSummary.averageRating} from ${reviewSummary.reviewCount} verified ${reviewSummary.reviewCount === 1 ? "review" : "reviews"}`
        : null,
  },
  {
    sort: "recently_verified",
    title: "Recently verified",
    rule: "Businesses Zed360 has most recently checked.",
    reason: ({ trust, verifiedAt }) => {
      const label = verificationLabel(trust);
      return label && verifiedAt ? `${label} ${shortDate(verifiedAt)}` : null;
    },
  },
  {
    sort: "newest",
    title: "Newly added",
    rule: "New businesses on Zed360.",
    reason: ({ joinedAt }) => `Joined ${shortDate(joinedAt)}`,
  },
];

/** The businesses a section may show: only those with a stated reason. */
export function sectionBusinesses(
  section: MeritSection,
  businesses: Business[],
  limit = 4,
) {
  return businesses
    .map((business) => ({ business, reason: section.reason(business) }))
    .filter(
      (entry): entry is { business: Business; reason: string } =>
        entry.reason !== null,
    )
    .slice(0, limit);
}
