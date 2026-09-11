"use client";

import { useFormStatus } from "react-dom";

export function CategoryStatusButton({
  action,
}: {
  action: "activated" | "deactivated";
}) {
  const { pending } = useFormStatus();
  const activating = action === "activated";
  return (
    <button
      className={
        activating
          ? "button button-primary disabled:opacity-50"
          : "rounded-xl border border-amber-200/25 px-5 py-3 text-sm font-semibold text-amber-100/80 disabled:opacity-50"
      }
      disabled={pending}
      name="action"
      onClick={(event) => {
        const message = activating
          ? "Activate this category for public forms and filters?"
          : "Deactivate this category for new selections? Existing records will be preserved.";
        if (!window.confirm(message)) event.preventDefault();
      }}
      type="submit"
      value={action}
    >
      {pending ? "Saving…" : activating ? "Activate" : "Deactivate"}
    </button>
  );
}
