import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const providerError = request.nextUrl.searchParams.get("error");

  if (providerError) {
    return redirectToSignInError(request, next);
  }

  const supabase = await createClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing authentication token") };

  if (!result.error) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  return redirectToSignInError(request, next);
}

function redirectToSignInError(request: NextRequest, next: string) {
  const signInUrl = new URL("/business/sign-in", request.url);
  signInUrl.searchParams.set("error", "invalid_or_expired");
  signInUrl.searchParams.set("next", next);
  return NextResponse.redirect(signInUrl);
}
