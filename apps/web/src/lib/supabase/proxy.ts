import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requiresAdminMfa } from "@/lib/admin-mfa-paths";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  // Do not remove this call. It validates and refreshes the session before
  // Server Components read it.
  const { data } = await supabase.auth.getClaims();

  // Signed-in sessions without a confirmed second factor are sent to the
  // authenticator step before any other admin page. The API enforces the
  // same rule; this only keeps the workspace from rendering access errors.
  const claims = data?.claims;
  if (
    claims &&
    claims.aal !== "aal2" &&
    requiresAdminMfa(request.nextUrl.pathname)
  ) {
    const mfaUrl = request.nextUrl.clone();
    mfaUrl.pathname = "/admin/mfa";
    mfaUrl.search = "";
    mfaUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    const redirect = NextResponse.redirect(mfaUrl);
    response.cookies
      .getAll()
      .forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
