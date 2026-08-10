"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  emptyRecentRequestsSnapshot,
  forgetRecentRequest,
  parseRecentRequests,
  recentRequestsSnapshot,
  subscribeRecentRequests,
} from "@/lib/recent-requests";

export function RecentRequestsPanel() {
  const snapshot = useSyncExternalStore(
    subscribeRecentRequests,
    recentRequestsSnapshot,
    emptyRecentRequestsSnapshot,
  );
  const requests = parseRecentRequests(snapshot);

  if (!requests.length) return null;

  return (
    <section className="rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">My recent requests</h2>
          <p className="mt-1 text-xs leading-5 text-white/42">
            Saved only in this browser. Remove them if this is a shared device.
          </p>
        </div>
        <span className="text-xs text-white/35">{requests.length}/5</span>
      </div>
      <div className="mt-4 grid gap-2">
        {requests.map((request) => (
          <div
            className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/15 p-3"
            key={request.shareToken}
          >
            <Link
              className="min-w-0 flex-1"
              href={`/request/${request.shareToken}`}
            >
              <span className="block truncate text-sm font-medium text-white/80">
                {request.summary}
              </span>
              <span className="mt-1 block text-xs text-white/35">
                Ref {request.id.slice(0, 8).toUpperCase()} · View responses
              </span>
            </Link>
            <button
              className="rounded-lg px-2 py-1 text-xs text-white/40 hover:bg-white/5 hover:text-white/70"
              onClick={() => forgetRecentRequest(request.shareToken)}
              type="button"
            >
              Forget
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
