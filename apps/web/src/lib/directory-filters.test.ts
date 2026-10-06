import assert from "node:assert/strict";
import { test } from "node:test";
import {
  directoryHref,
  filterChips,
  pageNumbers,
} from "./directory-filters.ts";

test("builds a clean address", () => {
  assert.equal(directoryHref({}), "/businesses");
  assert.equal(directoryHref({ q: "", page: "4" }), "/businesses");
  assert.equal(
    directoryHref({ q: "solar panels", province: "copperbelt" }, 3),
    "/businesses?q=solar+panels&province=copperbelt&page=3",
  );
});

test("each chip removes only its own filter and returns to page 1", () => {
  const chips = filterChips(
    { q: "solar", category: "energy", open: "1", page: "5" },
    { q: "“solar”", category: "Energy", open: "Open now" },
  );
  assert.deepEqual(
    chips.map(({ label }) => label),
    ["“solar”", "Energy", "Open now"],
  );
  assert.equal(chips[0].href, "/businesses?category=energy&open=1");
  assert.equal(chips[2].href, "/businesses?q=solar&category=energy");
});

test("removing a province also removes its district", () => {
  const [province, district] = filterChips(
    { province: "copperbelt", district: "d-1" },
    { province: "Copperbelt", district: "Kitwe" },
  );
  assert.equal(province.href, "/businesses");
  assert.equal(district.href, "/businesses?province=copperbelt");
});

test("no filters means no chips, and an unknown label falls back to the value", () => {
  assert.deepEqual(filterChips({ page: "2" }, {}), []);
  assert.equal(filterChips({ category: "energy" }, {})[0].label, "energy");
});

test("shows the first, last, and nearby pages", () => {
  assert.deepEqual(pageNumbers(1, 1), [1]);
  assert.deepEqual(pageNumbers(1, 3), [1, 2, 3]);
  assert.deepEqual(pageNumbers(1, 34), [1, 2, "gap", 34]);
  assert.deepEqual(pageNumbers(17, 34), [1, "gap", 16, 17, 18, "gap", 34]);
  assert.deepEqual(pageNumbers(34, 34), [1, "gap", 33, 34]);
});

test("shows a single skipped page instead of a gap", () => {
  assert.deepEqual(pageNumbers(3, 34), [1, 2, 3, 4, "gap", 34]);
  assert.deepEqual(pageNumbers(32, 34), [1, "gap", 31, 32, 33, 34]);
});
