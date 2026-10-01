import assert from "node:assert/strict";
import { test } from "node:test";
import { directionsHref } from "./directions.ts";

test("searches maps by business name, address, and district", () => {
  const href = directionsHref("Kopa Motors", {
    address: " Plot 12, Freedom Avenue ",
    coordinates: null,
    district: { name: "Kitwe", provinceName: "Copperbelt" },
  });
  assert.ok(href);
  const url = new URL(href);
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(
    url.searchParams.get("query"),
    "Kopa Motors, Plot 12, Freedom Avenue, Kitwe, Copperbelt, Zambia",
  );
});

test("works with only a district", () => {
  const href = directionsHref("Kopa Motors", {
    address: null,
    coordinates: null,
    district: { name: "Kitwe", provinceName: "Copperbelt" },
  });
  assert.equal(
    new URL(href ?? "").searchParams.get("query"),
    "Kopa Motors, Kitwe, Copperbelt, Zambia",
  );
});

test("offers no link without an address or district", () => {
  assert.equal(
    directionsHref("Kopa Motors", {
      address: "  ",
      coordinates: null,
      district: null,
    }),
    null,
  );
});

test("uses the owner's map pin for exact directions", () => {
  assert.equal(
    directionsHref("Kopa Motors", {
      address: "Plot 12, Freedom Avenue",
      coordinates: { latitude: -12.8024, longitude: 28.2132 },
      district: null,
    }),
    "https://www.google.com/maps/dir/?api=1&destination=-12.8024,28.2132",
  );
});
