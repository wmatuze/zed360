"use client";

import { useFormStatus } from "react-dom";

export function UserActionButton({
  action,
  children,
  className,
  confirmation,
}: {
  action: "role_granted" | "role_revoked" | "suspended" | "reinstated";
  children: string;
  className: string;
  confirmation: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}
      disabled={pending}
      name="action"
      onClick={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
      type="submit"
      value={action}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
