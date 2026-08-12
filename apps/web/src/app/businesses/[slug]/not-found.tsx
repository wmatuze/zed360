import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function BusinessNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--ink)] px-5 text-center text-white">
      <div>
        <BrandLogo className="justify-center" showWordmark={false} />
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.045em]">
          This profile is not available.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/48">
          It may be awaiting approval, suspended, closed, or the address may be
          incorrect.
        </p>
        <Link className="button button-primary mt-7" href="/businesses">
          Browse approved businesses →
        </Link>
      </div>
    </main>
  );
}
