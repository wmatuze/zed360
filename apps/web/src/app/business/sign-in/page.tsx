import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Business sign in",
  description: "Sign in securely to manage a Zed360 business account.",
};

export const dynamic = "force-dynamic";

export default async function BusinessSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const parameters = await searchParams;
  const nextPath = safeNextPath(parameters.next);
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <span className="brand-mark" aria-hidden="true">
            Z
          </span>
          <span className="text-xl font-semibold tracking-[-0.04em]">
            Zed360
          </span>
        </Link>
        <span className="text-xs text-white/35">Business access</span>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-10 pb-20 pt-14 lg:grid-cols-[.72fr_1.28fr] lg:pt-24">
        <div>
          <p className="eyebrow">
            <span /> Secure access
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Sign in without another password.
          </h1>
          <p className="mt-5 max-w-md leading-7 text-white/48">
            We will email you a single-use link. After signing in, the next step
            will be securely connecting your submitted business.
          </p>
        </div>
        <div>
          {parameters.error === "session_expired" ? (
            <p
              className="mb-4 rounded-xl border border-amber-200/20 bg-amber-200/8 px-4 py-3 text-sm text-amber-100/80"
              role="alert"
            >
              Your session expired or could not be verified. Request a fresh
              sign-in link to continue.
            </p>
          ) : null}
          <SignInForm nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
