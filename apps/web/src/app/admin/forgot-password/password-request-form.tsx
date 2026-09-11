"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestAdminPasswordReset,
  type AdminPasswordRequestState,
} from "./actions";

const initialState: AdminPasswordRequestState = {
  status: "idle",
  message: "",
};

export function AdminPasswordRequestForm() {
  const [state, action, pending] = useActionState(
    requestAdminPasswordReset,
    initialState,
  );
  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl sm:p-8"
    >
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Administrator username
        </span>
        <input
          autoComplete="username"
          autoFocus
          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
          maxLength={50}
          minLength={3}
          name="username"
          placeholder="administrator"
          required
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
        className="button button-primary w-full disabled:opacity-60 sm:w-auto"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sending instructions…" : "Send password setup email"}
      </button>
      <div>
        <Link
          className="text-sm font-medium text-white/55 hover:text-white"
          href="/admin/sign-in"
        >
          Return to administrator sign in
        </Link>
      </div>
    </form>
  );
}
