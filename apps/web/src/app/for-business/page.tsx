import type { Metadata } from "next";
import Link from "next/link";
import { BusinessApplicationForm } from "./business-application-form";

export const metadata: Metadata = {
  title: "Join as a business",
  description:
    "Tell Zed360 what your business does and where it can serve customers.",
};

export default function BusinessApplicationPage() {
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
        <Link
          className="text-xs text-white/45 transition hover:text-white"
          href="/business/sign-in"
        >
          Business sign in
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-10 pb-20 pt-14 lg:grid-cols-[.72fr_1.28fr] lg:pt-24">
        <div>
          <p className="eyebrow">
            <span /> For business owners
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Get matched for what you actually do.
          </h1>
          <p className="mt-5 max-w-md leading-7 text-white/48">
            Create a private draft profile with your main service and coverage
            area. Zed360 will review it before anything becomes public.
          </p>
          <div className="mt-8 space-y-3 text-sm text-white/45">
            <p>01 — Tell us what your business provides</p>
            <p>02 — Choose where you serve customers</p>
            <p>03 — Confirm ownership before publication</p>
          </div>
        </div>
        <BusinessApplicationForm />
      </section>
    </main>
  );
}
