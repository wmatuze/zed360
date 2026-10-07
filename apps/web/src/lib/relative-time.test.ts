import assert from "node:assert/strict";
import { test } from "node:test";
import { relativeTime } from "./relative-time.ts";

const now = new Date("2026-10-07T12:00:00.000Z");
const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds);
const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

test("describes recent times in words", () => {
  assert.equal(relativeTime(ago(20 * 1000), now), "Just now");
  assert.equal(relativeTime(ago(minute), now), "1 minute ago");
  assert.equal(relativeTime(ago(48 * minute), now), "48 minutes ago");
  assert.equal(relativeTime(ago(hour), now), "1 hour ago");
  assert.equal(relativeTime(ago(23 * hour), now), "23 hours ago");
});

test("describes the last week in days", () => {
  assert.equal(relativeTime(ago(30 * hour), now), "Yesterday");
  assert.equal(relativeTime(ago(3 * day), now), "3 days ago");
});

test("falls back to a date, with the year only when it differs", () => {
  assert.equal(relativeTime("2026-08-13T10:00:00.000Z", now), "13 Aug");
  assert.equal(relativeTime("2025-12-01T10:00:00.000Z", now), "1 Dec 2025");
});

test("a clock a little ahead never reads as the future", () => {
  assert.equal(relativeTime(ago(-5 * minute), now), "Just now");
});

test("accepts the ISO strings the API returns", () => {
  assert.equal(relativeTime("2026-10-07T11:30:00.000Z", now), "30 minutes ago");
});
