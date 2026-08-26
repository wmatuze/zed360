"use client";

import { useActionState } from "react";
import {
  requestSignInLink,
  type SignInState,
} from "@/app/business/sign-in/actions";

const initialState: SignInState = { status: "idle", message: "" };

export function ApplicationVerificationStep({
  claimToken,
  email,
}: {
  claimToken: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(
    requestSignInLink,
    initialState,
  );

  return (
    <form action={action} className="mt-6 border-t border-white/10 pt-6">
      <input name="email" type="hidden" value={email} />
      <input
        name="next"
        type="hidden"
        value={`/business/claim?token=${encodeURIComponent(claimToken)}`}
      />

      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lime)]">
        Next step
      </p>
      <h3 className="mt-2 text-lg font-semibold">Verify your email</h3>
      <p className="mt-2 text-sm leading-6 text-white/55">
        We will send a secure sign-in link to{" "}
        <span className="font-medium text-white/80">{email}</span>. Open it to
        connect this application to your business account.
      </p>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "mt-4 rounded-xl border border-[var(--lime)]/20 bg-black/15 px-4 py-3 text-sm text-white/75"
              : "mt-4 rounded-xl border border-red-300/20 bg-red-300/8 px-4 py-3 text-sm text-red-100"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}

      {state.status !== "success" ? (
        <button
          className="button button-primary mt-5 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Sending secure link…" : "Verify email and continue"}
          {!pending ? <span aria-hidden="true">→</span> : null}
        </button>
      ) : null}
    </form>
  );
}
