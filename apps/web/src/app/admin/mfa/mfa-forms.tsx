"use client";

import { useActionState, useState, useTransition } from "react";
import {
  startMfaEnrollment,
  verifyMfaCode,
  type MfaEnrollmentState,
  type MfaVerifyState,
} from "./actions";

const initialVerifyState: MfaVerifyState = { status: "idle", message: "" };

const cardClass =
  "space-y-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl sm:p-8";
const errorClass =
  "rounded-xl border border-red-300/20 bg-red-300/8 px-4 py-3 text-sm text-red-100";

function CodeForm({
  factorId,
  nextPath,
  submitLabel,
}: {
  factorId: string;
  nextPath: string;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState(
    verifyMfaCode,
    initialVerifyState,
  );
  return (
    <form action={action} className="space-y-5">
      <input name="factorId" type="hidden" value={factorId} />
      <input name="next" type="hidden" value={nextPath} />
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Six-digit code
        </span>
        <input
          autoComplete="one-time-code"
          autoFocus
          className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-lg tracking-[0.4em] outline-none transition placeholder:tracking-normal placeholder:text-white/25 focus:border-[var(--lime)]/55"
          inputMode="numeric"
          maxLength={6}
          minLength={6}
          name="code"
          pattern="\d{6}"
          placeholder="123456"
          required
        />
      </label>
      {state.message ? (
        <p className={errorClass} role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        className="button button-primary w-full disabled:opacity-60 sm:w-auto"
        disabled={pending}
        type="submit"
      >
        {pending ? "Checking…" : submitLabel}
      </button>
    </form>
  );
}

export function MfaVerifyForm({
  factorId,
  nextPath,
}: {
  factorId: string;
  nextPath: string;
}) {
  return (
    <div className={cardClass}>
      <p className="text-sm leading-6 text-white/55">
        Open your authenticator app and enter the current code for Zed360.
      </p>
      <CodeForm
        factorId={factorId}
        nextPath={nextPath}
        submitLabel="Confirm and continue"
      />
    </div>
  );
}

export function MfaEnrollForm({ nextPath }: { nextPath: string }) {
  const [enrollment, setEnrollment] = useState<MfaEnrollmentState>({
    status: "idle",
    message: "",
  });
  const [pending, startTransition] = useTransition();

  if (enrollment.status === "ready") {
    return (
      <div className={cardClass}>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-white/60">
          <li>
            Scan this QR code with an authenticator app such as Google
            Authenticator, Microsoft Authenticator, Authy, or 1Password.
          </li>
          <li>Enter the six-digit code the app shows.</li>
        </ol>
        {/* Supabase returns the QR code as an SVG data URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="QR code for adding Zed360 to an authenticator app"
          className="h-48 w-48 rounded-xl bg-white p-2"
          src={enrollment.qrCode}
        />
        <details className="text-sm text-white/50">
          <summary className="cursor-pointer">Can’t scan the code?</summary>
          <p className="mt-2">Enter this setup key in your app instead:</p>
          <code className="mt-1 block break-all rounded-lg bg-black/30 px-3 py-2 text-white/80">
            {enrollment.secret}
          </code>
        </details>
        <CodeForm
          factorId={enrollment.factorId}
          nextPath={nextPath}
          submitLabel="Finish setup"
        />
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <p className="text-sm leading-6 text-white/55">
        Administrator and reviewer accounts need an authenticator app in
        addition to a password. Setup takes about a minute.
      </p>
      {enrollment.status === "error" ? (
        <p className={errorClass} role="alert">
          {enrollment.message}
        </p>
      ) : null}
      <button
        className="button button-primary w-full disabled:opacity-60 sm:w-auto"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setEnrollment(await startMfaEnrollment());
          })
        }
        type="button"
      >
        {pending ? "Preparing…" : "Set up authenticator"}
      </button>
    </div>
  );
}
