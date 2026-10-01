import assert from "node:assert/strict";
import { test } from "node:test";
import { directionsHref } from "./directions.ts";

test("searches maps by business name, address, and district", () => {
  const href = directionsHref("Kopa Motors", {
    address: " Plot 12, Freedom Avenue ",
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
    district: { name: "Kitwe", provinceName: "Copperbelt" },
  });
  assert.equal(
    new URL(href ?? "").searchParams.get("query"),
    "Kopa Motors, Kitwe, Copperbelt, Zambia",
  );
});

test("offers no link without an address or district", () => {
  assert.equal(
    directionsHref("Kopa Motors", { address: "  ", district: null }),
    null,
  );
});
