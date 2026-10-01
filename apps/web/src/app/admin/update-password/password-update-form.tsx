"use client";

import { useActionState } from "react";
import { updateAdminPassword, type AdminPasswordUpdateState } from "./actions";

const initialState: AdminPasswordUpdateState = {
  status: "idle",
  message: "",
};

export function AdminPasswordUpdateForm() {
  const [state, action, pending] = useActionState(
    updateAdminPassword,
    initialState,
  );
  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl sm:p-8"
    >
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          New password
        </span>
        <input
          autoComplete="new-password"
          autoFocus
          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none transition focus:border-[var(--lime)]/55"
          maxLength={128}
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Confirm new password
        </span>
        <input
          autoComplete="new-password"
          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none transition focus:border-[var(--lime)]/55"
          maxLength={128}
          minLength={8}
          name="passwordConfirmation"
          required
          type="password"
        />
      </label>
      {state.message ? (
        <p
          className="rounded-xl border border-red-300/20 bg-red-300/8 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
      <button
        className="button button-primary w-full disabled:opacity-60 sm:w-auto"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving password…" : "Save administrator password"}
      </button>
      <p className="text-xs leading-5 text-white/30">
        Use at least eight characters and avoid passwords used on other
        services.
      </p>
    </form>
  );
}
