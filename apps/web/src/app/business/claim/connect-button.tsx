"use client";

import { useFormStatus } from "react-dom";

export function ConnectButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="button button-primary disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Connecting business…" : "Connect business"}
      {!pending ? <span aria-hidden="true">→</span> : null}
    </button>
  );
}
