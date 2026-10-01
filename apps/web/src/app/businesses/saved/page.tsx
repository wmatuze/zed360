import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { SavedBusinessesList } from "@/components/saved-businesses";

export const metadata: Metadata = {
  title: "Saved businesses",
  description: "Businesses you saved on Zed360 to contact or visit later.",
};

export default function SavedBusinessesPage() {
  return (
    <main className="min-h-screen bg-[var(--ink)] text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo />
        </Link>
        <Link
          className="text-sm text-white/55 transition hover:text-white"
          href="/businesses"
        >
          ← Browse businesses
        </Link>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-12 sm:px-8 lg:px-10 lg:pt-20">
        <p className="eyebrow">
          <span /> Your shortlist
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
          Saved businesses
        </h1>
        <p className="mt-5 max-w-2xl leading-7 text-white/50">
          Saved only on this device. No account is needed, and Zed360 does not
          receive your list.
        </p>
        <SavedBusinessesList />
      </section>
    </main>
  );
}
