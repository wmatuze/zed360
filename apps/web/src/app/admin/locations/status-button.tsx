"use client";
import { useFormStatus } from "react-dom";
export function LocationStatusButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={
        active
          ? "rounded-xl border border-amber-200/25 px-4 py-2 text-sm text-amber-100"
          : "button button-primary"
      }
      disabled={pending}
      name="action"
      onClick={(event) => {
        if (
          !window.confirm(
            active
              ? "Hide this location from new selections?"
              : "Make this location available for new selections?",
          )
        )
          event.preventDefault();
      }}
      type="submit"
      value={active ? "deactivated" : "activated"}
    >
      {pending ? "Saving…" : active ? "Deactivate" : "Activate"}
    </button>
  );
}
