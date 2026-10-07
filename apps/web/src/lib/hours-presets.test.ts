import assert from "node:assert/strict";
import { test } from "node:test";
import {
  copyToAllDays,
  copyToWeekdays,
  hoursPresets,
  type DayHours,
} from "./hours-presets.ts";

const week = (): DayHours[] =>
  Array.from({ length: 7 }, () => ({
    status: "closed" as const,
    opensAt: "08:00",
    closesAt: "17:00",
  }));

const preset = (key: string) => {
  const found = hoursPresets.find((item) => item.key === key);
  assert.ok(found);
  return found.apply(week());
};

const statuses = (days: DayHours[]) => days.map(({ status }) => status);

test("weekday preset opens Monday to Friday only", () => {
  assert.deepEqual(statuses(preset("weekdays")), [
    "closed",
    "hours",
    "hours",
    "hours",
    "hours",
    "hours",
    "closed",
  ]);
});

test("six-day preset gives Saturday a half day and keeps Sunday closed", () => {
  const days = preset("six-days");
  assert.equal(days[0].status, "closed");
  assert.deepEqual(days[6], {
    status: "hours",
    opensAt: "08:00",
    closesAt: "13:00",
  });
  assert.equal(days[3].closesAt, "17:00");
});

test("every-day and 24-hour presets cover the whole week", () => {
  assert.ok(preset("every-day").every(({ status }) => status === "hours"));
  assert.ok(preset("always").every(({ status }) => status === "open_24_hours"));
});

test("copies one day's hours to every day without sharing objects", () => {
  const days = week();
  days[2] = { status: "hours", opensAt: "09:30", closesAt: "18:00" };
  const copied = copyToAllDays(days, 2);
  assert.ok(copied.every((day) => day.opensAt === "09:30"));
  copied[0].opensAt = "10:00";
  assert.equal(copied[1].opensAt, "09:30");
});

test("copies one day's hours to weekdays and leaves the weekend alone", () => {
  const days = week();
  days[1] = { status: "hours", opensAt: "07:00", closesAt: "16:00" };
  days[6] = { status: "open_24_hours", opensAt: "08:00", closesAt: "17:00" };
  const copied = copyToWeekdays(days, 1);
  assert.deepEqual(
    copied.slice(1, 6).map(({ opensAt }) => opensAt),
    ["07:00", "07:00", "07:00", "07:00", "07:00"],
  );
  assert.equal(copied[0].status, "closed");
  assert.equal(copied[6].status, "open_24_hours");
});
