"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  parseSavedBusinesses,
  toggleSavedBusiness,
  type SavedBusiness,
} from "@/lib/saved-businesses";

const storageKey = "zed360:saved-businesses";
const changeEvent = "zed360:saved-change";

function readSaved() {
  try {
    return parseSavedBusinesses(localStorage.getItem(storageKey));
  } catch {
    return [];
  }
}

function writeSaved(saved: SavedBusiness[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {
    // Private browsing can block storage; the change still applies to this page.
  }
  window.dispatchEvent(new CustomEvent(changeEvent, { detail: saved }));
}

function useSaved() {
  const [saved, setSaved] = useState<SavedBusiness[] | null>(null);
  useEffect(() => {
    const sync = (event?: Event) =>
      setSaved(
        event instanceof CustomEvent && Array.isArray(event.detail)
          ? event.detail
          : readSaved(),
      );
    sync();
    window.addEventListener(changeEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(changeEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return saved;
}

type SaveBusinessButtonProps = {
  slug: string;
  name: string;
  place: string | null;
  variant?: "card" | "profile";
};

export function SaveBusinessButton({
  slug,
  name,
  place,
  variant = "profile",
}: SaveBusinessButtonProps) {
  const saved = useSaved() ?? [];
  const selected = saved.some((item) => item.slug === slug);
  const toggle = () =>
    writeSaved(toggleSavedBusiness(readSaved(), { slug, name, place }));
  const label = `${selected ? "Remove" : "Save"} ${name}${selected ? " from saved businesses" : ""}`;

  if (variant === "card")
    return (
      <button
        aria-label={label}
        aria-pressed={selected}
        className={`absolute bottom-4 right-4 z-10 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur ${selected ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-white/15 bg-[var(--ink)]/90 text-white/70 hover:border-[var(--lime)]/40"}`}
        onClick={toggle}
        title={label}
        type="button"
      >
        {selected ? "♥ Saved" : "♡ Save"}
      </button>
    );

  return (
    <button
      aria-label={label}
      aria-pressed={selected}
      className={`button ${selected ? "button-primary" : "button-secondary"}`}
      onClick={toggle}
      type="button"
    >
      {selected ? "♥ Saved" : "♡ Save"}
    </button>
  );
}

export function ShareBusinessButtons({ name }: { name: string }) {
  const [message, setMessage] = useState("Share");
  const shareOnWhatsapp = () =>
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${name} on Zed360: ${window.location.href}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} on Zed360`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Copy the address bar link");
    }
  };
  return (
    <>
      <button
        aria-live="polite"
        className="button button-secondary"
        onClick={share}
        type="button"
      >
        {message}
      </button>
      <button
        className="button button-secondary"
        onClick={shareOnWhatsapp}
        type="button"
      >
        Share on WhatsApp
      </button>
    </>
  );
}

export function SavedBusinessesLink() {
  const saved = useSaved();
  return (
    <Link
      className="text-sm text-white/55 transition hover:text-white"
      href="/businesses/saved"
    >
      ♡ Saved{saved?.length ? ` (${saved.length})` : ""}
    </Link>
  );
}

export function SavedBusinessesList() {
  const saved = useSaved();
  if (saved === null)
    return (
      <p className="mt-8 text-sm text-white/50">Loading saved businesses…</p>
    );

  if (!saved.length)
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
        <h2 className="text-xl font-semibold">Nothing saved yet.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">
          Tap ♡ Save on any business to keep it here for later.
        </p>
        <Link className="button button-primary mt-6" href="/businesses">
          Browse businesses →
        </Link>
      </div>
    );

  const compareSlugs = saved.slice(0, 3).map((item) => item.slug);
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {saved.map((business) => (
          <div className="relative" key={business.slug}>
            <Link
              className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-6 pb-16 transition hover:border-[var(--lime)]/35 hover:bg-white/[0.055]"
              href={`/businesses/${business.slug}`}
            >
              <h2 className="text-xl font-semibold tracking-[-0.03em] transition group-hover:text-[var(--lime)]">
                {business.name}
              </h2>
              {business.place ? (
                <p className="mt-2 text-sm text-white/50">{business.place}</p>
              ) : null}
              <p className="mt-4 text-xs text-white/50">
                Saved{" "}
                {new Intl.DateTimeFormat("en-ZM", {
                  dateStyle: "medium",
                }).format(new Date(business.savedAt))}
              </p>
            </Link>
            <SaveBusinessButton
              name={business.name}
              place={business.place}
              slug={business.slug}
              variant="card"
            />
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {compareSlugs.length >= 2 ? (
          <Link
            className="button button-primary"
            href={`/businesses/compare?slugs=${encodeURIComponent(compareSlugs.join(","))}`}
          >
            Compare {saved.length > 3 ? "the 3 newest" : "these"} →
          </Link>
        ) : null}
        <button
          className="button button-quiet"
          onClick={() => writeSaved([])}
          type="button"
        >
          Clear saved businesses
        </button>
      </div>
    </>
  );
}
