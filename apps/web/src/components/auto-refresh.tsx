"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Reloads the page's data on a timer, and when the owner returns to the tab,
 * so new items appear without a manual refresh. It pauses while the tab is in
 * the background to save mobile data.
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);
  return null;
}
