import { headers } from "next/headers";
import { isIP } from "node:net";

/**
 * Best-effort client address for sign-in attempt limits. Behind a proxy that
 * overwrites X-Forwarded-For (such as Vercel) this is the real visitor;
 * elsewhere it can be spoofed, so the API also limits per username or email.
 */
export async function clientIpAddress() {
  const requestHeaders = await headers();
  const candidate =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

export class TooManySignInAttemptsError extends Error {
  constructor() {
    super("Too many sign-in attempts.");
  }
}

export const tooManyAttemptsMessage =
  "Too many sign-in attempts from here. Please wait a while before trying again.";
