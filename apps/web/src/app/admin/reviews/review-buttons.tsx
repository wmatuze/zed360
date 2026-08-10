"use client";

import { useFormStatus } from "react-dom";

type BusinessStatus = "draft" | "active" | "suspended" | "closed";
type ReviewStatus = "pending" | "approved" | "rejected" | "changes_requested";

type ReviewAction = {
  decision:
    | "approved"
    | "rejected"
    | "changes_requested"
    | "suspended"
    | "approval_revoked"
    | "reopened"
    | "reinstated";
  label: string;
  tone: "primary" | "quiet" | "danger";
  confirmation?: string;
};

function availableActions(
  status: BusinessStatus,
  reviewStatus: ReviewStatus,
): ReviewAction[] {
  if (
    status === "draft" &&
    (reviewStatus === "pending" || reviewStatus === "changes_requested")
  ) {
    return [
      { decision: "approved", label: "Approve", tone: "primary" },
      {
        decision: "changes_requested",
        label: "Request corrections",
        tone: "quiet",
      },
      { decision: "rejected", label: "Reject", tone: "danger" },
    ];
  }
  if (status === "active" && reviewStatus === "approved") {
    return [
      {
        decision: "suspended",
        label: "Suspend business",
        tone: "quiet",
        confirmation:
          "Suspend this approved business? It will become unavailable until reinstated.",
      },
      {
        decision: "approval_revoked",
        label: "Revoke approval",
        tone: "danger",
        confirmation:
          "Revoke this business approval? It will return to rejected and unpublished status.",
      },
    ];
  }
  if (status === "suspended" && reviewStatus === "approved") {
    return [
      {
        decision: "reinstated",
        label: "Reinstate business",
        tone: "primary",
        confirmation: "Reinstate this business and make it active again?",
      },
      {
        decision: "approval_revoked",
        label: "Revoke approval",
        tone: "danger",
        confirmation:
          "Revoke this business approval? It will return to rejected and unpublished status.",
      },
    ];
  }
  if (status === "draft" && reviewStatus === "rejected") {
    return [
      {
        decision: "reopened",
        label: "Reopen review",
        tone: "quiet",
        confirmation: "Reopen this rejected submission for a fresh review?",
      },
    ];
  }
  return [];
}

export function ReviewButtons({
  status,
  reviewStatus,
}: {
  status: BusinessStatus;
  reviewStatus: ReviewStatus;
}) {
  const { pending } = useFormStatus();
  const actions = availableActions(status, reviewStatus);

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <button
          className={
            action.tone === "primary"
              ? "button button-primary disabled:cursor-not-allowed disabled:opacity-50"
              : action.tone === "quiet"
                ? "button button-quiet disabled:cursor-not-allowed disabled:opacity-50"
                : "rounded-xl border border-red-300/25 px-5 py-3 text-sm font-semibold text-red-100/80 transition hover:bg-red-300/10 disabled:cursor-not-allowed disabled:opacity-50"
          }
          disabled={pending}
          key={action.decision}
          name="decision"
          onClick={(event) => {
            const reason = event.currentTarget.form
              ? new FormData(event.currentTarget.form).get("reason")
              : null;
            const requiresReason =
              action.decision !== "approved" &&
              action.decision !== "reopened" &&
              action.decision !== "reinstated";
            if (
              requiresReason &&
              (typeof reason !== "string" || reason.trim().length < 10)
            ) {
              window.alert(
                "Enter a clear reason of at least 10 characters before continuing.",
              );
              event.preventDefault();
              return;
            }
            if (action.confirmation && !window.confirm(action.confirmation)) {
              event.preventDefault();
            }
          }}
          type="submit"
          value={action.decision}
        >
          {pending ? "Saving…" : action.label}
        </button>
      ))}
    </div>
  );
}
