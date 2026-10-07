"use client";

import type { BusinessOperatingHours } from "@zed360/contracts";
import { useActionState, useState } from "react";
import {
  copyToAllDays,
  copyToWeekdays,
  hoursPresets,
  type DayHours,
} from "@/lib/hours-presets";
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
  const [days, setDays] = useState<DayHours[]>(() =>
    location.operatingHours.days.map((day) => ({
      status: day.status,
      opensAt: day.status === "hours" ? day.opensAt : "08:00",
      closesAt: day.status === "hours" ? day.closesAt : "17:00",
    })),
  );
  const [changed, setChanged] = useState(false);
  const update = (next: DayHours[]) => {
    setDays(next);
    setChanged(true);
  };
  const setDay = (index: number, patch: Partial<DayHours>) =>
    update(days.map((day, at) => (at === index ? { ...day, ...patch } : day)));

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{location.name}</h2>
          <p className="mt-1 text-sm text-white/50">
            {[
              location.districtName,
              location.isPrimary ? "Primary location" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
          {location.operatingHours.configured ? "Published" : "Not published"}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-sm text-white/65">Start from a common pattern</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {hoursPresets.map((preset) => (
            <button
              className="rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-[var(--lime)]/40 hover:text-white"
              key={preset.key}
              onClick={() => update(preset.apply(days))}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/50">
          Then adjust any day below. Nothing is published until you save.
        </p>
      </div>

      <div className="mt-5 divide-y divide-white/8 rounded-2xl border border-white/8 bg-black/10">
        {days.map((day, index) => (
          <div
            className="grid gap-3 p-4 sm:grid-cols-[7rem_1fr_7rem_7rem_auto] sm:items-center"
            key={dayNames[index]}
          >
            <p className="text-sm font-semibold text-white/75">
              {dayNames[index]}
            </p>
            <select
              aria-label={`${dayNames[index]} status`}
              className="h-11 rounded-xl border border-white/10 bg-[#10141c] px-3 text-sm"
              name={`day-${index}-status`}
              onChange={(event) =>
                setDay(index, {
                  status: event.target.value as DayHours["status"],
                })
              }
              value={day.status}
            >
              <option value="closed">Closed</option>
              <option value="hours">Set hours</option>
              <option value="open_24_hours">Open 24 hours</option>
            </select>
            <label className="text-xs text-white/50">
              Opens
              <input
                className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm disabled:opacity-30"
                disabled={day.status !== "hours"}
                name={`day-${index}-opens`}
                onChange={(event) =>
                  setDay(index, { opensAt: event.target.value })
                }
                type="time"
                value={day.opensAt}
              />
            </label>
            <label className="text-xs text-white/50">
              Closes
              <input
                className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm disabled:opacity-30"
                disabled={day.status !== "hours"}
                name={`day-${index}-closes`}
                onChange={(event) =>
                  setDay(index, { closesAt: event.target.value })
                }
                type="time"
                value={day.closesAt}
              />
            </label>
            <div className="flex gap-3 text-xs sm:flex-col sm:gap-1">
              <button
                className="text-left text-[var(--lime)]/85 hover:underline"
                onClick={() => update(copyToWeekdays(days, index))}
                title={`Give Monday to Friday the same hours as ${dayNames[index]}`}
                type="button"
              >
                Copy to weekdays
              </button>
              <button
                className="text-left text-[var(--lime)]/85 hover:underline"
                onClick={() => update(copyToAllDays(days, index))}
                title={`Give every day the same hours as ${dayNames[index]}`}
                type="button"
              >
                Copy to all days
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-white/50">
        For overnight trading, use a closing time earlier than the opening time,
        for example 18:00 to 02:00.
      </p>
      {state.message && !changed ? (
        <p
          className={`mt-4 rounded-xl border p-3 text-sm ${state.status === "success" ? "border-[var(--lime)]/25 bg-[var(--lime)]/8" : "border-red-300/20 bg-red-300/8 text-red-100"}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      {changed ? (
        <p className="mt-4 text-sm text-amber-100/85" role="status">
          You have changes that are not saved yet.
        </p>
      ) : null}
      <button
        className="button button-primary mt-5"
        disabled={pending}
        onClick={() => setChanged(false)}
        type="submit"
      >
        {pending ? "Saving…" : "Save and publish hours"}
      </button>
    </form>
  );
}
