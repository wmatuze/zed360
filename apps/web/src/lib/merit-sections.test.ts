import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublicBusinessDirectory } from "@zed360/contracts";
import {
  meritSections,
  sectionBusinesses,
  verificationLabel,
} from "./merit-sections.ts";

type Business = PublicBusinessDirectory["businesses"][number];

const business = (overrides: Partial<Business>): Business =>
  ({
    id: "93235cce-34d5-457b-b090-2aa2e973d8d1",
    slug: "kopa-motors",
    name: "Kopa Motors",
    trust: { contactVerified: false, registrationVerified: false },
    reviewSummary: { averageRating: null, reviewCount: 0 },
    verifiedAt: null,
    joinedAt: "2026-08-07T09:00:00.000Z",
    ...overrides,
  }) as Business;

const section = (sort: string) => {
  const found = meritSections.find((item) => item.sort === sort);
  assert.ok(found);
  return found;
};

test("names the specific check instead of a generic verified label", () => {
  assert.equal(
    verificationLabel({ contactVerified: true, registrationVerified: false }),
    "Contact verified",
  );
  assert.equal(
    verificationLabel({ contactVerified: true, registrationVerified: true }),
    "Registration verified",
  );
  assert.equal(
    verificationLabel({ contactVerified: false, registrationVerified: false }),
    null,
  );
});

test("top rated shows the rating and how many reviews earned it", () => {
  const reason = section("top_rated").reason;
  assert.equal(
    reason(business({ reviewSummary: { averageRating: 5, reviewCount: 1 } })),
    "★ 5 from 1 verified review",
  );
  assert.equal(
    reason(
      business({ reviewSummary: { averageRating: 4.8, reviewCount: 50 } }),
    ),
    "★ 4.8 from 50 verified reviews",
  );
  assert.equal(reason(business({})), null);
});

test("recently verified needs both a public check and its date", () => {
  const reason = section("recently_verified").reason;
  assert.equal(
    reason(
      business({
        trust: { contactVerified: true, registrationVerified: false },
        verifiedAt: "2026-08-31T12:21:08.000Z",
      }),
    ),
    "Contact verified 31 Aug 2026",
  );
  assert.equal(
    reason(
      business({
        trust: { contactVerified: true, registrationVerified: false },
      }),
    ),
    null,
  );
  assert.equal(
    reason(business({ verifiedAt: "2026-08-31T12:21:08.000Z" })),
    null,
  );
});

test("a section never shows a business without a reason, and caps its length", () => {
  const rated = business({
    slug: "rated",
    reviewSummary: { averageRating: 5, reviewCount: 2 },
  });
  assert.deepEqual(
    sectionBusinesses(section("top_rated"), [business({}), rated]).map(
      ({ business: item }) => item.slug,
    ),
    ["rated"],
  );
  const many = Array.from({ length: 9 }, (_, index) =>
    business({ slug: `business-${index}` }),
  );
  assert.equal(sectionBusinesses(section("newest"), many).length, 4);
});

test("every section has a title and a short description", () => {
  for (const item of meritSections) {
    assert.ok(item.title.length > 0);
    assert.ok(item.rule.length > 0 && item.rule.length < 80);
  }
});
