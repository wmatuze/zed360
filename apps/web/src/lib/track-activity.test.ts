import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { activityUrl, trackActivity, zambiaDay } from "./track-activity.ts";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("uses the Zambian calendar day", () => {
  // 22:30 UTC is already the next day in Lusaka (UTC+2).
  assert.equal(zambiaDay(new Date("2026-10-05T22:30:00.000Z")), "2026-10-06");
  assert.equal(zambiaDay(new Date("2026-10-05T21:59:00.000Z")), "2026-10-05");
});

test("addresses one business", () => {
  assert.ok(
    activityUrl("kopa-motors").endsWith("/businesses/kopa-motors/activity"),
  );
});

test("sends only the kind of activity", () => {
  const calls: Array<[string, RequestInit]> = [];
  globalThis.fetch = ((url: string, init: RequestInit) => {
    calls.push([url, init]);
    return Promise.resolve(new Response(null, { status: 204 }));
  }) as typeof fetch;

  trackActivity("kopa-motors", "contact_whatsapp");

  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].keepalive, true);
  assert.equal(calls[0][1].credentials, undefined);
  assert.deepEqual(JSON.parse(String(calls[0][1].body)), {
    event: "contact_whatsapp",
  });
});

test("never throws when counting fails", async () => {
  globalThis.fetch = (() =>
    Promise.reject(new Error("offline"))) as typeof fetch;
  assert.doesNotThrow(() => trackActivity("kopa-motors", "profile_view"));

  globalThis.fetch = (() => {
    throw new Error("blocked");
  }) as typeof fetch;
  assert.doesNotThrow(() => trackActivity("kopa-motors", "profile_view"));
  await new Promise((resolve) => setImmediate(resolve));
});
