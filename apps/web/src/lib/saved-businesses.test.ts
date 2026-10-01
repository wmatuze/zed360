import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSavedBusinesses,
  savedBusinessesLimit,
  toggleSavedBusiness,
} from "./saved-businesses.ts";

const kopa = {
  slug: "kopa-motors",
  name: "Kopa Motors",
  place: "Kitwe, Copperbelt",
};

test("ignores missing, malformed, and tampered storage", () => {
  assert.deepEqual(parseSavedBusinesses(null), []);
  assert.deepEqual(parseSavedBusinesses("not json"), []);
  assert.deepEqual(parseSavedBusinesses('{"slug":"kopa"}'), []);
  assert.deepEqual(
    parseSavedBusinesses(
      JSON.stringify([
        { slug: "../admin", name: "Bad", place: null, savedAt: "x" },
        { slug: "ok", name: "", place: null, savedAt: "x" },
        { slug: "ok", name: "Ok", place: 4, savedAt: "x" },
      ]),
    ),
    [],
  );
});

test("keeps the first copy of a duplicated slug", () => {
  const raw = JSON.stringify([
    { ...kopa, savedAt: "2026-10-01T00:00:00.000Z" },
    { ...kopa, name: "Older", savedAt: "2026-09-01T00:00:00.000Z" },
  ]);
  const parsed = parseSavedBusinesses(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, "Kopa Motors");
});

test("saves newest first and removes on a second toggle", () => {
  const now = new Date("2026-10-01T08:00:00.000Z");
  const saved = toggleSavedBusiness([], kopa, now);
  assert.deepEqual(saved, [{ ...kopa, savedAt: now.toISOString() }]);
  const withSecond = toggleSavedBusiness(
    saved,
    { slug: "lusaka-lodge", name: "Lusaka Lodge", place: null },
    now,
  );
  assert.equal(withSecond[0].slug, "lusaka-lodge");
  assert.deepEqual(toggleSavedBusiness(withSecond, kopa), [withSecond[0]]);
});

test("drops the oldest business beyond the limit", () => {
  let saved = toggleSavedBusiness([], kopa);
  for (let index = 0; index < savedBusinessesLimit; index += 1)
    saved = toggleSavedBusiness(saved, {
      slug: `business-${index}`,
      name: `Business ${index}`,
      place: null,
    });
  assert.equal(saved.length, savedBusinessesLimit);
  assert.ok(!saved.some((item) => item.slug === kopa.slug));
});
