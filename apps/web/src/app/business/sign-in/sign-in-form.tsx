"use client";

import { useActionState } from "react";
import { requestSignInLink, type SignInState } from "./actions";

const initialState: SignInState = { status: "idle", message: "" };

export function SignInForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(
    requestSignInLink,
    initialState,
  );

  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl sm:p-8"
    >
      <input name="next" type="hidden" value={nextPath} />
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Business email address
        </span>
        <input
          autoComplete="email"
          autoFocus
          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
          maxLength={254}
          name="email"
          placeholder="you@business.co.zm"
          required
          type="email"
        />
      </label>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 px-4 py-3 text-sm text-white/75"
              : "rounded-xl border border-red-300/20 bg-red-300/8 px-4 py-3 text-sm text-red-100"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="button button-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sending secure link…" : "Email me a sign-in link"}
        {!pending ? <span aria-hidden="true">→</span> : null}
      </button>

      <p className="text-xs leading-5 text-white/30">
        No password is required. Receiving the email verifies control of this
        address; it does not verify a business or grant access to customer
        requests.
      </p>
    </form>
  );
}
