"use client";

import { useState } from "react";

export function PrivateRequestActions({
  shareToken,
  summary,
}: {
  shareToken: string;
  summary: string;
}) {
  const [feedback, setFeedback] = useState("");

  function privateUrl() {
    return `${window.location.origin}/request/${shareToken}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(privateUrl());
      setFeedback("Private link copied.");
    } catch {
      setFeedback(
        "Your browser could not copy the link. Open the request and copy its address.",
      );
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My private Zed360 request",
          text: summary,
          url: privateUrl(),
        });
        setFeedback("Private link shared.");
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  function sendToWhatsApp() {
    const text = encodeURIComponent(
      `My private Zed360 request: ${summary}\n${privateUrl()}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <button
          className="button button-secondary"
          onClick={copyLink}
          type="button"
        >
          Copy private link
        </button>
        <button
          className="button button-secondary"
          onClick={shareLink}
          type="button"
        >
          Share link
        </button>
        <button
          className="button button-secondary"
          onClick={sendToWhatsApp}
          type="button"
        >
          Send via WhatsApp
        </button>
      </div>
      {feedback ? (
        <p className="mt-3 text-sm text-[var(--lime)]" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
