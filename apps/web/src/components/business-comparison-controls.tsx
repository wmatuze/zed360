"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const storageKey = "zed360:business-comparison";
const changeEvent = "zed360:comparison-change";

function readSelection() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value)
      ? value
          .filter((slug): slug is string => typeof slug === "string")
          .slice(0, 3)
      : [];
  } catch {
    return [];
  }
}

function writeSelection(slugs: string[]) {
  localStorage.setItem(storageKey, JSON.stringify(slugs));
  window.dispatchEvent(new CustomEvent(changeEvent, { detail: slugs }));
}

function useSelection() {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    const sync = (event?: Event) =>
      setSlugs(
        event instanceof CustomEvent && Array.isArray(event.detail)
          ? event.detail
          : readSelection(),
      );
    sync();
    window.addEventListener(changeEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(changeEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return slugs;
}

export function CompareButton({ slug, name }: { slug: string; name: string }) {
  const slugs = useSelection();
  const selected = slugs.includes(slug);
  const [message, setMessage] = useState("");
  const toggle = () => {
    if (selected) {
      writeSelection(slugs.filter((item) => item !== slug));
      setMessage("");
      return;
    }
    if (slugs.length >= 3) {
      setMessage("Remove one business first");
      return;
    }
    writeSelection([...slugs, slug]);
    setMessage("");
  };
  return (
    <div className="absolute bottom-4 left-4 z-10">
      <button
        aria-pressed={selected}
        className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur ${selected ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-white/15 bg-[var(--ink)]/90 text-white/70 hover:border-[var(--lime)]/40"}`}
        onClick={toggle}
        title={`${selected ? "Remove" : "Add"} ${name} ${selected ? "from" : "to"} comparison`}
        type="button"
      >
        {selected ? "✓ Comparing" : "+ Compare"}
      </button>
      {message ? (
        <p className="mt-1 text-[.65rem] text-amber-100">{message}</p>
      ) : null}
    </div>
  );
}

export function ComparisonTray() {
  const slugs = useSelection();
  if (!slugs.length) return null;
  return (
    <div className="sticky bottom-4 z-30 mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--lime)]/25 bg-[#11170f]/95 p-4 shadow-2xl backdrop-blur">
      <div>
        <p className="text-sm font-semibold">{slugs.length} of 3 selected</p>
        <p className="text-xs text-white/42">Choose at least two businesses.</p>
      </div>
      <div className="flex gap-2">
        <button
          className="button button-quiet"
          onClick={() => writeSelection([])}
          type="button"
        >
          Clear
        </button>
        {slugs.length >= 2 ? (
          <Link
            className="button button-primary"
            href={`/businesses/compare?slugs=${encodeURIComponent(slugs.join(","))}`}
          >
            Compare now →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function ShareComparisonButton() {
  const [message, setMessage] = useState("Share comparison");
  const share = async () => {
    try {
      if (navigator.share)
        await navigator.share({
          title: "Zed360 business comparison",
          url: window.location.href,
        });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage("Link copied");
      }
    } catch {
      setMessage("Share cancelled");
    }
  };
  return (
    <button className="button button-secondary" onClick={share} type="button">
      {message}
    </button>
  );
}
