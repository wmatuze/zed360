import assert from "node:assert/strict";
import { test } from "node:test";
import { requiresAdminMfa } from "./admin-mfa-paths.ts";
import { adminNextPath } from "./safe-next-path.ts";

test("requires MFA for the admin workspace and password reset", () => {
  for (const path of [
    "/admin",
    "/admin/users",
    "/admin/reviews",
    "/admin/update-password",
  ]) {
    assert.equal(requiresAdminMfa(path), true, path);
  }
});

test("allows sign-in, reset requests, and the MFA step itself", () => {
  for (const path of [
    "/admin/sign-in",
    "/admin/forgot-password",
    "/admin/mfa",
    "/business/dashboard",
    "/administrator",
    "/",
  ]) {
    assert.equal(requiresAdminMfa(path), false, path);
  }
});

test("keeps admin next paths inside the workspace", () => {
  assert.equal(adminNextPath("/admin/users?page=2"), "/admin/users?page=2");
  assert.equal(adminNextPath("/business/dashboard"), "/admin");
  assert.equal(adminNextPath("/administrator"), "/admin");
  assert.equal(adminNextPath("//evil.com"), "/admin");
});
