import assert from "node:assert/strict";
import { test } from "node:test";
import type { BusinessDashboard } from "@zed360/contracts";
import {
  attentionItems,
  percentage,
  responseTimeLabel,
} from "./dashboard-attention.ts";

type Business = BusinessDashboard["businesses"][number];

function business(overrides: {
  [Key in keyof Business]?: Partial<Business[Key]>;
}): Business {
  const healthy: Business = {
    id: "ef7e5e78-5c1d-49b8-87aa-296145c2fc05",
    name: "Kopa Motors",
    slug: "kopa-motors",
    status: "active",
    reviewStatus: "approved",
    role: "owner",
    presence: {
      availability: "available",
      availabilityNote: null,
      availabilityUpdatedAt: null,
      availabilityFreshness: "current",
      profileLastConfirmedAt: null,
      profileFreshness: "current",
    },
    metrics: {
      openMatches: 0,
      responsesSent: 0,
      customerSelections: 0,
      publishedProducts: 0,
      pendingMedia: 0,
      publishedReviews: 0,
      awaitingResponse: 0,
      locationsWithoutPin: 0,
      locationsWithoutHours: 0,
    },
    last30Days: {
      matches: 0,
      responses: 0,
      selections: 0,
      medianResponseMinutes: null,
    },
    activity: {
      last30Days: {
        profileViews: 0,
        whatsapp: 0,
        calls: 0,
        emails: 0,
        websiteVisits: 0,
        directions: 0,
        shares: 0,
      },
      previous30Days: { profileViews: 0, contacts: 0 },
      daily: [],
    },
    setup: {
      approved: true,
      hasAvailableService: true,
      hasCoverage: true,
      hasPublishedProduct: false,
      hasApprovedMedia: true,
    },
  };
  const merged = { ...healthy } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides))
    merged[key] =
      value && typeof value === "object"
        ? { ...(healthy[key as keyof Business] as object), ...value }
        : value;
  return merged as Business;
}

const keys = (value: Business) => attentionItems(value).map(({ key }) => key);

test("a healthy business needs nothing, and products stay optional", () => {
  assert.deepEqual(keys(business({})), []);
});

test("waiting customers come before setup work", () => {
  const items = attentionItems(
    business({
      metrics: { awaitingResponse: 2, locationsWithoutPin: 1 },
      presence: { availabilityFreshness: "stale" },
    }),
  );
  assert.deepEqual(
    items.map(({ key }) => key),
    ["awaiting-response", "availability", "map-pin"],
  );
  assert.equal(items[0].title, "2 requests are waiting for your response");
  assert.equal(items[2].title, "1 location has no map pin");
  assert.equal(
    items[2].href,
    "/business/ef7e5e78-5c1d-49b8-87aa-296145c2fc05/locations",
  );
});

test("coverage is only requested once a service exists", () => {
  assert.deepEqual(
    keys(
      business({ setup: { hasAvailableService: false, hasCoverage: false } }),
    ),
    ["service"],
  );
  assert.deepEqual(keys(business({ setup: { hasCoverage: false } })), [
    "coverage",
  ]);
});

test("staff see customer work but not management tasks", () => {
  assert.deepEqual(
    keys(
      business({
        role: "staff",
        metrics: {
          awaitingResponse: 1,
          locationsWithoutPin: 1,
          locationsWithoutHours: 1,
        },
        setup: { hasApprovedMedia: false },
      }),
    ),
    ["awaiting-response"],
  );
});

test("a business under review is not nagged about freshness", () => {
  const items = attentionItems(
    business({
      reviewStatus: "pending",
      presence: {
        availabilityFreshness: "unconfirmed",
        profileFreshness: "unconfirmed",
      },
      metrics: { pendingMedia: 3 },
    }),
  );
  assert.deepEqual(
    items.map(({ key }) => key),
    ["pending-review", "pending-media"],
  );
  assert.ok(items.every(({ href }) => href === null));
});

test("requested corrections lead the list", () => {
  assert.equal(
    keys(
      business({
        reviewStatus: "changes_requested",
        metrics: { locationsWithoutHours: 1 },
      }),
    )[0],
    "corrections",
  );
});

test("formats response time and rates", () => {
  assert.equal(responseTimeLabel(null), null);
  assert.equal(responseTimeLabel(0.4), "Under a minute");
  assert.equal(responseTimeLabel(25.4), "25 min");
  assert.equal(responseTimeLabel(60), "1 hour");
  assert.equal(responseTimeLabel(150), "2.5 hours");
  assert.equal(responseTimeLabel(60 * 36), "1.5 days");
  assert.equal(percentage(1, 4), 25);
  assert.equal(percentage(5, 4), 100);
  assert.equal(percentage(0, 0), null);
});
