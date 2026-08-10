"use client";

import type { MatchedBusinessRequest } from "@zed360/contracts";
import { useActionState } from "react";
import { submitResponse, type ResponseFormState } from "./actions";

const initialState: ResponseFormState = { status: "idle", message: "" };

export function ResponseForm({
  matchId,
  response,
}: {
  matchId: string;
  response: MatchedBusinessRequest["response"];
}) {
  const action = submitResponse.bind(null, matchId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 border-t border-white/8 pt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-white/65">
          Availability
          <select
            className="min-h-12 rounded-xl border border-white/12 bg-[var(--panel)] px-4 text-white outline-none focus:border-[var(--lime)]/60"
            defaultValue={response?.status ?? "available"}
            name="status"
          >
            <option value="available">Available</option>
            <option value="needs_more_information">
              Need more information
            </option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2 text-sm text-white/65">
            Price from (ZMW)
            <input
              className="min-h-12 min-w-0 rounded-xl border border-white/12 bg-[var(--panel)] px-4 text-white outline-none focus:border-[var(--lime)]/60"
              defaultValue={response?.priceMinimum ?? ""}
              min="0"
              name="priceMinimum"
              step="0.01"
              type="number"
            />
          </label>
          <label className="grid gap-2 text-sm text-white/65">
            Price to (ZMW)
            <input
              className="min-h-12 min-w-0 rounded-xl border border-white/12 bg-[var(--panel)] px-4 text-white outline-none focus:border-[var(--lime)]/60"
              defaultValue={response?.priceMaximum ?? ""}
              min="0"
              name="priceMaximum"
              step="0.01"
              type="number"
            />
          </label>
        </div>
      </div>
      {state.issues?.priceMaximum ? (
        <p className="mt-2 text-sm text-red-200">{state.issues.priceMaximum}</p>
      ) : null}

      <label className="mt-4 grid gap-2 text-sm text-white/65">
        Message to the customer
        <textarea
          className="min-h-28 resize-y rounded-xl border border-white/12 bg-[var(--panel)] px-4 py-3 text-white outline-none focus:border-[var(--lime)]/60"
          defaultValue={response?.message ?? ""}
          maxLength={1200}
          name="message"
          placeholder="Explain what you can offer, what the price covers, or what else you need to know."
          required
        />
      </label>
      {state.issues?.message ? (
        <p className="mt-2 text-sm text-red-200">{state.issues.message}</p>
      ) : null}

      {state.message ? (
        <p
          className={`mt-4 text-sm ${state.status === "success" ? "text-[var(--lime)]" : "text-red-200"}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="button button-primary mt-5"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving…" : response ? "Update response" : "Send response"}
      </button>
    </form>
  );
}
