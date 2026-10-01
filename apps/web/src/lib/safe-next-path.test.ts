import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNextPath } from "./safe-next-path.ts";

test("keeps same-site paths with query and hash", () => {
  assert.equal(safeNextPath("/admin/users?page=2#top"), "/admin/users?page=2#top");
  assert.equal(safeNextPath("/business/account"), "/business/account");
});

test("falls back for missing or external destinations", () => {
  for (const value of [
    null,
    undefined,
    "",
    "admin",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "/\tevil.com",
    "/\n/evil.com",
  ]) {
    assert.equal(safeNextPath(value, "/fallback"), "/fallback", String(value));
  }
});
