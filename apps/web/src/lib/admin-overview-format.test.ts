import assert from "node:assert/strict";
import { test } from "node:test";
import { activityLabel, trend, waiting } from "./admin-overview-format.ts";

const now = new Date("2026-10-05T12:00:00.000Z");
const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds);
const hour = 60 * 60 * 1000;

test("an empty queue has no waiting time", () => {
  assert.equal(waiting(null, now), null);
});

test("describes how long the oldest item has waited", () => {
  assert.deepEqual(waiting(ago(20 * 60 * 1000), now), {
    label: "under an hour",
    overdue: false,
  });
  assert.deepEqual(waiting(ago(hour), now), {
    label: "1 hour",
    overdue: false,
  });
  assert.deepEqual(waiting(ago(30 * hour), now), {
    label: "1 day",
    overdue: false,
  });
});

test("marks decisions older than two days as overdue", () => {
  assert.deepEqual(waiting(ago(47 * hour), now), {
    label: "1 day",
    overdue: false,
  });
  assert.deepEqual(waiting(ago(5 * 24 * hour), now), {
    label: "5 days",
    overdue: true,
  });
});

test("a clock difference never produces a negative wait", () => {
  assert.deepEqual(waiting(ago(-hour), now), {
    label: "under an hour",
    overdue: false,
  });
});

test("compares a period with the one before", () => {
  assert.deepEqual(trend(0, 7), {
    direction: "down",
    label: "Down from 7 in the 30 days before",
  });
  assert.equal(trend(9, 7).direction, "up");
  assert.equal(trend(3, 3).label, "Same as the 30 days before");
});

test("describes audit actions in plain words", () => {
  assert.equal(
    activityLabel("category.created", "category"),
    "created a category",
  );
  assert.equal(activityLabel("user.suspended", "user"), "suspended a user");
  assert.equal(
    activityLabel("request.outcome_reset", "customer_request"),
    "request outcome reset",
  );
});
