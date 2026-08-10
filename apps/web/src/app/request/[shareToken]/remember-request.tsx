"use client";

import { useEffect } from "react";
import { rememberRecentRequest } from "@/lib/recent-requests";

export function RememberRequest({
  request,
  shareToken,
}: {
  request: { id: string; summary: string; createdAt: string };
  shareToken: string;
}) {
  useEffect(() => {
    rememberRecentRequest({ ...request, shareToken });
  }, [request, shareToken]);

  return null;
}
