import type { Metadata } from "next";
import Link from "next/link";
import { RequestForm } from "./request-form";

export const metadata: Metadata = {
  title: "Post a request",
  description: "Tell Zed360 what you need, where you need it, and when.",
};

export default function RequestPage() {
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
        <span className="text-xs text-white/35">Request beta</span>
      </header>
      <section className="mx-auto grid w-full max-w-5xl gap-10 pb-20 pt-14 lg:grid-cols-[.72fr_1.28fr] lg:pt-24">
        <div>
          <p className="eyebrow">
            <span /> One request
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            What can a business help you with?
          </h1>
          <p className="mt-5 max-w-md leading-7 text-white/48">
            Give us enough detail to match your request accurately. You will
            stay in control of who you contact.
          </p>
        </div>
        <RequestForm />
      </section>
    </main>
  );
}
