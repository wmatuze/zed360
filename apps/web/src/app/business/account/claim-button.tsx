"use client";

import { useFormStatus } from "react-dom";

export function ClaimButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button button-primary" disabled={pending} type="submit">
      {pending ? "Linking business…" : "Link this business →"}
    </button>
  );
}
