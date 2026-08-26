"use client";

import type {
  BusinessLocationManagement,
  ReferenceData,
} from "@zed360/contracts";
import { useActionState, useState } from "react";
import {
  changeStatus,
  createLocation,
  setPrimary,
  updateLocation,
  type LocationActionState,
} from "./actions";

const initial: LocationActionState = { status: "idle", message: "" };
type Location = BusinessLocationManagement["locations"][number];

function Fields({
  referenceData,
  location,
}: {
  referenceData: ReferenceData;
  location?: Location;
}) {
  const initialProvince =
    referenceData.provinces.find((province) =>
      province.districts.some(({ id }) => id === location?.districtId),
    )?.id ??
    referenceData.provinces[0]?.id ??
    "";
  const [provinceId, setProvinceId] = useState(initialProvince);
  const province = referenceData.provinces.find(({ id }) => id === provinceId);
  return (
    <>
      <label className="text-sm text-white/65">
        Location or branch name
        <input
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"
          defaultValue={location?.name ?? ""}
          maxLength={120}
          name="name"
          placeholder="For example: Kitwe branch"
          required
        />
      </label>
      <label className="text-sm text-white/65">
        Street address or landmark
        <input
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"
          defaultValue={location?.address ?? ""}
          maxLength={500}
          name="address"
          placeholder="Optional but helpful for visitors"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/65">
          Province
          <select
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#10141c] px-4"
            onChange={(event) => setProvinceId(event.target.value)}
            value={provinceId}
          >
            {referenceData.provinces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-white/65">
          District
          <select
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#10141c] px-4"
            defaultValue={
              province?.districts.some(({ id }) => id === location?.districtId)
                ? (location?.districtId ?? "")
                : ""
            }
            key={provinceId}
            name="districtId"
            required
          >
            <option disabled value="">
              Select a district
            </option>
            {province?.districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}

function Message({ state }: { state: LocationActionState }) {
  return state.message ? (
    <p
      className={`rounded-xl border p-3 text-sm ${state.status === "success" ? "border-[var(--lime)]/25 bg-[var(--lime)]/8" : "border-red-300/20 bg-red-300/8 text-red-100"}`}
    >
      {state.message}
    </p>
  ) : null;
}

function LocationCard({
  businessId,
  location,
  referenceData,
}: {
  businessId: string;
  location: Location;
  referenceData: ReferenceData;
}) {
  const [editState, editAction, editing] = useActionState(
    updateLocation.bind(null, businessId, location.id),
    initial,
  );
  const [primaryState, primaryAction, changingPrimary] = useActionState(
    setPrimary.bind(null, businessId, location.id),
    initial,
  );
  const [statusState, statusAction, changingStatus] = useActionState(
    changeStatus.bind(null, businessId, location.id, !location.isActive),
    initial,
  );
  return (
    <article
      className={`rounded-3xl border p-6 ${location.isActive ? "border-white/10 bg-white/[0.035]" : "border-white/6 bg-white/[0.015] opacity-70"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{location.name}</h2>
          <p className="mt-1 text-sm text-white/42">
            {[location.districtName, location.provinceName]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex gap-2">
          {location.isPrimary ? (
            <span className="rounded-full border border-[var(--lime)]/25 bg-[var(--lime)]/8 px-3 py-1 text-xs text-[var(--lime)]">
              Primary
            </span>
          ) : null}
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
            {location.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
      <form action={editAction} className="mt-5 grid gap-4">
        <Fields location={location} referenceData={referenceData} />
        <Message state={editState} />
        <button
          className="button button-secondary w-fit"
          disabled={editing || !location.isActive}
          type="submit"
        >
          {editing ? "Saving…" : "Save changes"}
        </button>
      </form>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-5">
        {!location.isPrimary && location.isActive ? (
          <form action={primaryAction}>
            <button className="button button-quiet" disabled={changingPrimary}>
              Make primary
            </button>
          </form>
        ) : null}
        <form action={statusAction}>
          <button className="button button-quiet" disabled={changingStatus}>
            {location.isActive ? "Deactivate" : "Reactivate"}
          </button>
        </form>
        {location.isActive ? (
          <a
            className="button button-quiet"
            href={`/business/${businessId}/hours`}
          >
            {location.operatingHoursConfigured ? "Edit hours" : "Add hours"}
          </a>
        ) : null}
      </div>
      <Message state={primaryState.message ? primaryState : statusState} />
    </article>
  );
}

export function LocationManager({
  businessId,
  locations,
  referenceData,
}: {
  businessId: string;
  locations: Location[];
  referenceData: ReferenceData;
}) {
  const [state, action, pending] = useActionState(
    createLocation.bind(null, businessId),
    initial,
  );
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
      <form
        action={action}
        className="grid gap-4 rounded-3xl border border-[var(--lime)]/20 bg-[var(--lime)]/6 p-6 lg:sticky lg:top-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--lime)]">
            New branch
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Add a location</h2>
        </div>
        <Fields referenceData={referenceData} />
        <Message state={state} />
        <button className="button button-primary w-fit" disabled={pending}>
          {pending ? "Adding…" : "Add location"}
        </button>
      </form>
      <div className="grid gap-5">
        {locations.map((location) => (
          <LocationCard
            businessId={businessId}
            key={location.id}
            location={location}
            referenceData={referenceData}
          />
        ))}
      </div>
    </div>
  );
}
