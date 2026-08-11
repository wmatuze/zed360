"use client";

import type { SharedCustomerRequest } from "@zed360/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

const statusLabels = {
  pending: "Awaiting Zed360 review",
  approved: "Published on the business profile",
  rejected: "Changes required",
} as const;

export function CustomerReviewForm({
  businessName,
  review,
  shareToken,
}: {
  businessName: string;
  review: SharedCustomerRequest["review"];
  shareToken: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [body, setBody] = useState(review?.body ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(
        `${apiUrl}/requests/shared/${shareToken}/review`,
        {
          body: JSON.stringify({ rating, body }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const result = (await response.json().catch(() => null)) as {
        message?: unknown;
      } | null;
      if (!response.ok) {
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Your review could not be saved.",
        );
      }
      setMessage("Review submitted for moderation.");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Your review could not be saved.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--lime)]">
            Verified interaction
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Review {businessName}
          </h2>
        </div>
        {review ? (
          <span className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/60">
            {statusLabels[review.moderationStatus]}
          </span>
        ) : null}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48">
        Your rating is linked to a business you selected through Zed360. A
        comment is optional. Reviews are checked before appearing publicly.
      </p>

      {review?.moderationStatus === "rejected" && review.moderationNote ? (
        <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/8 p-4 text-sm text-red-100/80">
          Review note: {review.moderationNote}
        </div>
      ) : null}

      <form className="mt-5" onSubmit={submit}>
        <fieldset>
          <legend className="text-sm font-semibold text-white/75">
            Rating
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                aria-pressed={rating === value}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${rating === value ? "border-[var(--lime)]/45 bg-[var(--lime)]/12 text-[var(--lime)]" : "border-white/10 bg-black/15 text-white/55 hover:border-white/20"}`}
                key={value}
                onClick={() => setRating(value)}
                type="button"
              >
                {value} {value === 1 ? "star" : "stars"}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-5 block text-sm font-semibold text-white/75">
          Comment <span className="font-normal text-white/35">(optional)</span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-normal outline-none focus:border-[var(--lime)]/55"
            maxLength={1200}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Describe your experience without sharing private information."
            value={body}
          />
        </label>
        <button className="button button-primary mt-4" disabled={pending}>
          {pending
            ? "Submitting…"
            : review
              ? "Update review"
              : "Submit review"}
        </button>
        {review?.moderationStatus === "approved" ? (
          <p className="mt-3 text-xs leading-5 text-white/38">
            Updating a published review sends it through moderation again.
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm text-[var(--lime)]" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-200/80" role="status">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
