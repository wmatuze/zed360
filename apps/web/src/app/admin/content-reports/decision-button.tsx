"use client";

type DecisionButtonProps = {
  decision: "dismissed" | "content_removed" | "business_suspended";
  label: string;
  danger?: boolean;
  confirmation?: string;
};

export function DecisionButton({
  decision,
  label,
  danger = false,
  confirmation,
}: DecisionButtonProps) {
  return (
    <button
      className={
        danger
          ? "rounded-xl border border-red-300/30 bg-red-300/8 px-4 py-3 text-sm font-semibold text-red-100 transition hover:border-red-300/55 hover:bg-red-300/12"
          : "button button-secondary"
      }
      name="decision"
      onClick={(event) => {
        if (confirmation && !window.confirm(confirmation)) {
          event.preventDefault();
        }
      }}
      value={decision}
    >
      {label}
    </button>
  );
}
