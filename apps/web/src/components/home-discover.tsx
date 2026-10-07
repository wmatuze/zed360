"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";

export type DiscoverTab = {
  sort: string;
  title: string;
  rule: string;
  businesses: Array<{
    slug: string;
    name: string;
    logoUrl: string | null;
    place: string;
    reason: string;
  }>;
};

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * One homepage section with a tab per list (top rated, most viewed, and so
 * on) instead of a stack of look-alike sections. Tabs with no businesses are
 * left out by the caller.
 */
export function HomeDiscover({ tabs }: { tabs: DiscoverTab[] }) {
  // Open on the fullest list so the section never starts on a near-empty tab.
  const [selected, setSelected] = useState(
    () =>
      [...tabs].sort((a, b) => b.businesses.length - a.businesses.length)[0]
        ?.sort,
  );
  const id = useId();
  const active = tabs.find(({ sort }) => sort === selected) ?? tabs[0];
  if (!active) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = tabs.findIndex(({ sort }) => sort === active.sort);
    const next = tabs[(index + step + tabs.length) % tabs.length];
    setSelected(next.sort);
    document.getElementById(`${id}-tab-${next.sort}`)?.focus();
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
      <p className="eyebrow">
        <span /> Discover
      </p>
      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Popular and new on Zed360.
        </h2>
        <div
          aria-label="Business lists"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          onKeyDown={onKeyDown}
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = tab.sort === active.sort;
            return (
              <button
                aria-controls={`${id}-panel`}
                aria-selected={isActive}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${isActive ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-white/12 text-white/65 hover:border-white/30 hover:text-white"}`}
                id={`${id}-tab-${tab.sort}`}
                key={tab.sort}
                onClick={() => setSelected(tab.sort)}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                type="button"
              >
                {tab.title}
              </button>
            );
          })}
        </div>
      </div>

      <div
        aria-labelledby={`${id}-tab-${active.sort}`}
        className="mt-8"
        id={`${id}-panel`}
        role="tabpanel"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-white/55">{active.rule}</p>
          <Link
            className="text-sm font-semibold text-[var(--lime)] hover:underline"
            href={`/businesses?sort=${active.sort}`}
          >
            View all →
          </Link>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {active.businesses.map((business) => (
            <li key={business.slug}>
              <Link
                className="group flex h-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[var(--lime)]/35 hover:bg-white/[0.055]"
                href={`/businesses/${business.slug}`}
              >
                <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--lime)] text-sm font-extrabold text-[var(--ink)]">
                  {business.logoUrl ? (
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="56px"
                      src={business.logoUrl}
                      unoptimized
                    />
                  ) : (
                    initials(business.name)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold transition group-hover:text-[var(--lime)]">
                    {business.name}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-white/55">
                    {business.place}
                  </span>
                  <span className="mt-1.5 block text-sm font-medium text-white/85">
                    {business.reason}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
