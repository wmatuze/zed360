"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { path: "profile", label: "Profile" },
  { path: "services", label: "Services" },
  { path: "coverage", label: "Coverage" },
  { path: "catalog", label: "Storefront" },
  { path: "locations", label: "Locations" },
  { path: "hours", label: "Hours" },
  { path: "presence", label: "Availability" },
  { path: "reviews", label: "Reviews" },
] as const;

/**
 * Tabs shared by every screen that manages one business, so an owner can move
 * between them without returning to the dashboard each time.
 */
export function BusinessWorkspaceNav({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Manage this business"
      className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto pb-1"
    >
      {sections.map((section) => {
        const href = `/business/${businessId}/${section.path}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${active ? "border-[var(--lime)] bg-[var(--lime)] font-semibold text-[var(--ink)]" : "border-white/12 text-white/65 hover:border-white/30 hover:text-white"}`}
            href={href}
            key={section.path}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
