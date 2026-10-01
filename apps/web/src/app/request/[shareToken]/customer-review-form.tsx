"use client";

import {
  customerReviewSchema,
  reviewCodeSentSchema,
  type ReviewCodeSent,
  type SharedCustomerRequest,
} from "@zed360/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

const statusLabels = {
  pending: "Awaiting Zed360 review",
  approved: "Your current review is published",
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
  const [currentReview, setCurrentReview] = useState(review);
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [body, setBody] = useState(review?.body ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verification, setVerification] = useState<ReviewCodeSent | null>(
    null,
  );
  const [sendingCode, setSendingCode] = useState(false);

  async function sendCode() {
    setSendingCode(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(
        `${apiUrl}/requests/shared/${shareToken}/review/code`,
        {
          body: JSON.stringify({ phone }),
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
            : "The WhatsApp code could not be sent.",
        );
      }
      const sent = reviewCodeSentSchema.safeParse(result);
      if (!sent.success) throw new Error("The WhatsApp code could not be sent.");
      setVerification(sent.data);
      setCode("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "The WhatsApp code could not be sent.",
      );
    } finally {
      setSendingCode(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verification) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(
        `${apiUrl}/requests/shared/${shareToken}/review`,
        {
          body: JSON.stringify({
            rating,
            body,
            verificationId: verification.verificationId,
            code,
          }),
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
      const savedReview = customerReviewSchema.safeParse(result);
      if (!savedReview.success) {
        throw new Error(
          "The review was saved, but its status could not be displayed.",
        );
      }
      setCurrentReview(savedReview.data);
      // Each code works once; another edit needs a fresh confirmation.
      setVerification(null);
      setCode("");
      setMessage(
        savedReview.data.moderationStatus === "approved"
          ? "Review published."
          : "Review saved and sent for a safety check.",
      );
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
          <h2 className="mt-2 text-xl font-semibold">Review {businessName}</h2>
        </div>
        {currentReview ? (
          <span className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/60">
            {statusLabels[currentReview.moderationStatus]}
          </span>
        ) : null}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48">
        Rate the business you chose. To keep reviews genuine, we’ll confirm
        your WhatsApp number — no account needed, and the business never sees
        it.
      </p>

      {currentReview?.moderationStatus === "rejected" &&
      currentReview.moderationNote ? (
        <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/8 p-4 text-sm text-red-100/80">
          Review note: {currentReview.moderationNote}
        </div>
      ) : null}

      <form className="mt-5" onSubmit={submit}>
        <fieldset>
          <legend className="text-sm font-semibold text-white/75">
            <span className="text-[var(--lime)]">1</span> · Rate your experience
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
        <fieldset className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4">
          <legend className="px-1 text-sm font-semibold text-white/75">
            <span className="text-[var(--lime)]">2</span> · Confirm on WhatsApp
          </legend>
          {verification ? (
            <div>
              <p className="text-sm text-white/60">
                We sent a code to {verification.sentTo} on WhatsApp. It expires
                in 10 minutes.
              </p>
              <label className="mt-3 block text-sm font-semibold text-white/75">
                Six-digit code
                <input
                  autoComplete="one-time-code"
                  className="mt-2 block h-11 w-full max-w-48 rounded-xl border border-white/10 bg-black/20 px-4 font-normal tracking-[0.3em] outline-none focus:border-[var(--lime)]/55"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  pattern="[0-9]{6}"
                  required
                  value={code}
                />
              </label>
              <button
                className="mt-2 text-xs font-medium text-white/50 hover:text-white"
                onClick={() => setVerification(null)}
                type="button"
              >
                Use a different number or resend
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="block text-sm font-semibold text-white/75">
                WhatsApp number
                <input
                  autoComplete="tel"
                  className="mt-2 block h-11 w-full min-w-0 max-w-64 rounded-xl border border-white/10 bg-black/20 px-4 font-normal outline-none focus:border-[var(--lime)]/55"
                  inputMode="tel"
                  maxLength={20}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0977 123 456"
                  type="tel"
                  value={phone}
                />
              </label>
              <button
                className="button button-secondary"
                disabled={sendingCode || phone.trim().length < 7}
                onClick={sendCode}
                type="button"
              >
                {sendingCode ? "Sending…" : "Send code"}
              </button>
              <p className="basis-full text-xs text-white/60">
                Enter your number and we’ll send a six-digit code. Your review
                is submitted once you enter it.
              </p>
            </div>
          )}
        </fieldset>
        <button
          className="button button-primary mt-4"
          disabled={pending || !verification || code.length !== 6}
        >
          {pending
            ? "Submitting…"
            : currentReview
              ? "Update review"
              : "Submit review"}
        </button>
        {currentReview?.moderationStatus === "approved" ? (
          <p className="mt-3 text-xs leading-5 text-white/38">
            Updates normally publish immediately. Content containing contact
            details, external links, or spam patterns may need a safety check.
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
