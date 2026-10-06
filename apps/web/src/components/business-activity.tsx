"use client";

import type { BusinessActivityEvent } from "@zed360/contracts";
import { useEffect, type ReactNode } from "react";
import { trackActivity, zambiaDay } from "@/lib/track-activity";

/**
 * Counts one profile view per browser tab per day, so refreshing the page
 * does not inflate a business's figures. Runs only in a real browser, which
 * also keeps most crawlers out of the count.
 */
export function ProfileViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `zed360:viewed:${slug}`;
    const today = zambiaDay();
    try {
      if (sessionStorage.getItem(key) === today) return;
      sessionStorage.setItem(key, today);
    } catch {
      // Storage can be blocked; count the view anyway.
    }
    trackActivity(slug, "profile_view");
  }, [slug]);
  return null;
}

export function TrackedLink({
  slug,
  event,
  href,
  className,
  external = false,
  children,
}: {
  slug: string;
  event: BusinessActivityEvent;
  href: string;
  className: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      className={className}
      href={href}
      onClick={() => trackActivity(slug, event)}
      {...(external ? { rel: "noreferrer", target: "_blank" } : {})}
    >
      {children}
    </a>
  );
}
