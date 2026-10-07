"use client";

import { useActionState, useId } from "react";
import { saveReply, type ReviewReplyState } from "./actions";

const initial: ReviewReplyState = { status: "idle", message: "" };

export function ReplyForm({
  businessId,
  reviewId,
  existing,
}: {
  businessId: string;
  reviewId: string;
  existing: string | null;
}) {
  const [state, action, pending] = useActionState(
    saveReply.bind(null, businessId, reviewId),
    initial,
  );
  const id = useId();
  return (
    <form action={action} className="mt-5 border-t border-white/8 pt-5">
      <label className="text-sm text-white/65" htmlFor={id}>
        {existing ? "Your public reply" : "Reply publicly"}
      </label>
      <textarea
        className="mt-2 min-h-24 w-full resize-y rounded-xl border border-white/12 bg-black/20 px-4 py-3 text-sm outline-none focus:border-[var(--lime)]/55"
        defaultValue={existing ?? ""}
        id={id}
        maxLength={1200}
        minLength={2}
        name="body"
        placeholder="Thank the customer, or explain what you have done about their concern."
        required
      />
      <p className="mt-2 text-xs leading-5 text-white/50">
        Everyone who views your profile can read this. Do not include the
        customer&apos;s name, phone number, or other private details.
      </p>
      {state.message ? (
        <p
          className={`mt-3 text-sm ${state.status === "success" ? "text-[var(--lime)]" : "text-red-200"}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <button
        className={`button mt-4 ${existing ? "button-secondary" : "button-primary"}`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving…" : existing ? "Update reply" : "Post reply"}
      </button>
    </form>
  );
}
