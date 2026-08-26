"use client";

import type { BusinessOperatingHours } from "@zed360/contracts";
import { useActionState, useState } from "react";
import { saveHours, type OperatingHoursFormState } from "./actions";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Location = BusinessOperatingHours["locations"][number];
const initialState: OperatingHoursFormState = { status: "idle", message: "" };

export function HoursForm({
  businessId,
  location,
}: {
  businessId: string;
  location: Location;
}) {
  const action = saveHours.bind(null, businessId, location.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [statuses, setStatuses] = useState(
    location.operatingHours.days.map((day) => day.status),
  );

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{location.name}</h2>
          <p className="mt-1 text-sm text-white/42">
            {[
              location.districtName,
              location.isPrimary ? "Primary location" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/48">
          {location.operatingHours.configured ? "Published" : "Not published"}
        </span>
      </div>

      <div className="mt-6 divide-y divide-white/8 rounded-2xl border border-white/8 bg-black/10">
        {location.operatingHours.days.map((day, index) => {
          const hasTimes = day.status === "hours";
          return (
            <div
              className="grid gap-3 p-4 sm:grid-cols-[7rem_1fr_8rem_8rem] sm:items-center"
              key={day.dayOfWeek}
            >
              <p className="text-sm font-semibold text-white/75">
                {dayNames[day.dayOfWeek]}
              </p>
              <select
                className="h-11 rounded-xl border border-white/10 bg-[#10141c] px-3 text-sm"
                name={`day-${day.dayOfWeek}-status`}
                onChange={(event) =>
                  setStatuses((current) =>
                    current.map((value, position) =>
                      position === index
                        ? (event.target.value as typeof value)
                        : value,
                    ),
                  )
                }
                value={statuses[index]}
              >
                <option value="closed">Closed</option>
                <option value="hours">Set hours</option>
                <option value="open_24_hours">Open 24 hours</option>
              </select>
              <label className="text-xs text-white/38">
                Opens
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm disabled:opacity-30"
                  defaultValue={hasTimes ? day.opensAt : "08:00"}
                  disabled={statuses[index] !== "hours"}
                  name={`day-${day.dayOfWeek}-opens`}
                  type="time"
                />
              </label>
              <label className="text-xs text-white/38">
                Closes
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm disabled:opacity-30"
                  defaultValue={hasTimes ? day.closesAt : "17:00"}
                  disabled={statuses[index] !== "hours"}
                  name={`day-${day.dayOfWeek}-closes`}
                  type="time"
                />
              </label>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-5 text-white/38">
        For overnight trading, use a closing time earlier than the opening time,
        for example 18:00 to 02:00.
      </p>
      {state.message ? (
        <p
          className={`mt-4 rounded-xl border p-3 text-sm ${state.status === "success" ? "border-[var(--lime)]/25 bg-[var(--lime)]/8" : "border-red-300/20 bg-red-300/8 text-red-100"}`}
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
        {pending ? "Saving…" : "Save and publish hours"}
      </button>
    </form>
  );
}
