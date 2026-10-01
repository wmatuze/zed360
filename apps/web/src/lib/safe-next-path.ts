const internalOrigin = "http://zed360.internal";

export function safeNextPath(
  value: string | null | undefined,
  fallback = "/business/dashboard",
) {
  // Browsers treat "\" like "/" and ignore tabs and newlines, so "/\evil.com"
  // would otherwise resolve to another host.
  if (!value?.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  try {
    const url = new URL(value, internalOrigin);
    if (url.origin !== internalOrigin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Same as safeNextPath, but only allows destinations inside /admin. */
export function adminNextPath(value: string | null | undefined) {
  const path = safeNextPath(value, "/admin");
  return path === "/admin" ||
    path.startsWith("/admin/") ||
    path.startsWith("/admin?")
    ? path
    : "/admin";
}
