"use client";

import type { SubmitContentReport } from "@zed360/contracts";
import { useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

const reasons = {
  misleading: "Misleading information",
  scam_or_fraud: "Suspected scam or fraud",
  impersonation: "Impersonation",
  prohibited_content: "Prohibited content",
  harassment: "Harassment or abuse",
  privacy: "Private information exposed",
  spam: "Spam",
  other: "Another concern",
} as const;

export function ReportContent({
  targetId,
  targetType,
  compact = false,
}: {
  targetId: string;
  targetType: SubmitContentReport["targetType"];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${apiUrl}/content-reports`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetId,
        targetType,
        reason: form.get("reason"),
        details: form.get("details"),
        reporterEmail: form.get("reporterEmail"),
        website: form.get("website"),
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    setPending(false);
    if (!response.ok) {
      setError(
        typeof result?.message === "string"
          ? result.message
          : "The report could not be submitted.",
      );
      return;
    }
    setMessage(
      "Report received. Zed360 will review it without taking automatic action.",
    );
    setOpen(false);
  }

  if (message) return <p className="text-xs text-white/40">{message}</p>;
  return (
    <div className={compact ? "mt-4" : ""}>
      <button
        className="text-xs text-white/35 underline-offset-4 hover:text-white/65 hover:underline"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open
          ? "Cancel report"
          : targetType === "business"
            ? "Report this business"
            : "Report this review"}
      </button>
      {open ? (
        <form
          className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
          onSubmit={submit}
        >
          <label className="text-xs text-white/60">
            Concern
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#10141c] px-3 py-2 text-white"
              defaultValue="misleading"
              name="reason"
            >
              {Object.entries(reasons).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/60">
            What should Zed360 examine?
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-white/10 bg-[#10141c] px-3 py-2 text-white"
              maxLength={1200}
              minLength={20}
              name="details"
              required
            />
          </label>
          <label className="text-xs text-white/60">
            Your email (optional)
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#10141c] px-3 py-2 text-white"
              name="reporterEmail"
              type="email"
            />
          </label>
          <input className="hidden" name="website" tabIndex={-1} type="text" />
          <p className="text-[0.68rem] leading-5 text-white/30">
            A report starts a review. It does not automatically remove content
            or suspend a business.
          </p>
          <button
            className="button button-secondary w-fit"
            disabled={pending}
            type="submit"
          >
            {pending ? "Submitting..." : "Submit report"}
          </button>
          {error ? (
            <p className="text-xs text-red-200/75" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
