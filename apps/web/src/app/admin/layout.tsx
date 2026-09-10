import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/business/account/actions";
import { BrandLogo } from "@/components/brand-logo";

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reviews", label: "Businesses" },
  { href: "/admin/profile-revisions", label: "Profiles" },
  { href: "/admin/customer-reviews", label: "Reviews" },
  { href: "/admin/media-reviews", label: "Media" },
  { href: "/admin/content-reports", label: "Reports" },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--ink)] text-white">
      <header className="border-b border-white/8 px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
          <Link className="flex items-center gap-3" href="/">
            <BrandLogo />
            <span className="hidden border-l border-white/12 pl-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/38 sm:inline">
              Administration
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link className="button button-quiet" href="/business/account">
              Business account
            </Link>
            <form action={signOut}>
              <button className="button button-quiet" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav
          aria-label="Administration"
          className="mx-auto mt-4 flex w-full max-w-6xl gap-2 overflow-x-auto pb-1"
        >
          {navigation.map((item) => (
            <Link
              className="shrink-0 rounded-lg border border-white/8 px-3 py-2 text-sm text-white/55 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
