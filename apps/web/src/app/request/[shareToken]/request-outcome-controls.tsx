"use client";

import type { CustomerRequestOutcomeAction } from "@zed360/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

async function sendOutcome(
  shareToken: string,
  action: CustomerRequestOutcomeAction,
) {
  const response = await fetch(`${apiUrl}/requests/shared/${shareToken}/outcome`, {
    body: JSON.stringify(action),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : "The request could not be updated.",
    );
  }
}

export function ResponseOutcomeControls({
  businessName,
  contacted,
  matchId,
  requestClosed,
  selected,
  shareToken,
}: {
  businessName: string;
  contacted: boolean;
  matchId: string;
  requestClosed: boolean;
  selected: boolean;
  shareToken: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"contacted" | "chosen" | null>(null);
  const [error, setError] = useState("");

  async function submit(action: "contacted" | "chosen") {
    if (
      action === "chosen" &&
      !window.confirm(
        `Confirm that you chose ${businessName}. This will close your request.`,
      )
    ) {
      return;
    }
    setPending(action);
    setError("");
    try {
      await sendOutcome(shareToken, { action, matchId });
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The request could not be updated.",
      );
    } finally {
      setPending(null);
    }
  }

  if (selected) {
    return (
      <div className="mt-5 rounded-xl border border-[var(--lime)]/25 bg-[var(--lime)]/8 px-4 py-3 text-sm font-semibold text-[var(--lime)]">
        Your selected business
      </div>
    );
  }

  if (requestClosed) {
    return contacted ? (
      <p className="mt-5 text-xs font-semibold text-white/42">
        You marked this business as contacted.
      </p>
    ) : null;
  }

  return (
    <div className="mt-5 border-t border-white/8 pt-5">
      <p className="text-xs leading-5 text-white/42">
        Use these controls only after you contact or choose this business.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="button button-quiet"
          disabled={contacted || pending !== null}
          onClick={() => submit("contacted")}
          type="button"
        >
          {contacted
            ? "Contact recorded"
            : pending === "contacted"
              ? "Recording…"
              : "I contacted them"}
        </button>
        <button
          className="button button-primary"
          disabled={pending !== null}
          onClick={() => submit("chosen")}
          type="button"
        >
          {pending === "chosen" ? "Saving…" : "Choose this business"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-200/80" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RequestClosureControls({
  requestStatus,
  shareToken,
}: {
  requestStatus: "open" | "matched" | "resolved" | "expired" | "cancelled";
  shareToken: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (requestStatus === "expired") return null;

  const closed = requestStatus === "resolved" || requestStatus === "cancelled";
  async function submit() {
    const message = closed
      ? "Reopen this request so businesses can respond again?"
      : "Close this request without choosing a business?";
    if (!window.confirm(message)) return;
    setPending(true);
    setError("");
    try {
      await sendOutcome(shareToken, {
        action: closed ? "reopened" : "closed_without_choice",
      });
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The request could not be updated.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="font-semibold">
        {closed ? "Need more responses?" : "Finished with this request?"}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/45">
        {closed
          ? "Reopening makes the request available to matched businesses again."
          : "Close it if you no longer need the service and did not choose one of these businesses."}
      </p>
      <button
        className="button button-quiet mt-4"
        disabled={pending}
        onClick={submit}
        type="button"
      >
        {pending
          ? "Updating…"
          : closed
            ? "Reopen request"
            : "Close without choosing"}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-red-200/80" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
