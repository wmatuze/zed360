"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAdmin, type AdminSignInState } from "./actions";

const initialState: AdminSignInState = { status: "idle", message: "" };

export function AdminSignInForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(signInAdmin, initialState);
  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl sm:p-8"
    >
      <input name="next" type="hidden" value={nextPath} />
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Username
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
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Password
        </span>
        <input
          autoComplete="current-password"
          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
          maxLength={128}
          minLength={8}
          name="password"
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
        {pending ? "Signing in…" : "Sign in to administration"}
      </button>
      <p className="text-xs leading-5 text-white/30">
        This sign-in is restricted to active administrator and reviewer
        accounts.
      </p>
      <Link
        className="inline-block text-sm font-medium text-[var(--lime)] hover:underline"
        href="/admin/forgot-password"
      >
        Set or reset your password
      </Link>
    </form>
  );
}
