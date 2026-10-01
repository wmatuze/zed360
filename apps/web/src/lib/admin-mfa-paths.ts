// Admin pages a password-only session may open: signing in, requesting a
// reset email, and completing the authenticator step itself.
const adminPathsWithoutMfa = [
  "/admin/sign-in",
  "/admin/forgot-password",
  "/admin/mfa",
];

export function requiresAdminMfa(pathname: string) {
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return false;
  return !adminPathsWithoutMfa.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
