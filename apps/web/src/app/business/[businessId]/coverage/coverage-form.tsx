"use client";

import type {
  BusinessServiceCoverage,
  ReferenceData,
} from "@zed360/contracts";
import { useActionState, useState } from "react";
import { saveCoverage, type CoverageFormState } from "./actions";

type Service = BusinessServiceCoverage["services"][number];
type GeographicMode = "business_travel" | "delivery";

const initialState: CoverageFormState = { status: "idle", message: "" };

function optionFor(service: Service, mode: string) {
  return service.options.find((option) => option.mode === mode);
}

function GeographicCoverage({
  mode,
  service,
  referenceData,
}: {
  mode: GeographicMode;
  service: Service;
  referenceData: ReferenceData;
}) {
  const current = optionFor(service, mode);
  const [enabled, setEnabled] = useState(Boolean(current));
  const [scope, setScope] = useState(
    current?.coverageScope ?? "selected_districts",
  );
  const title = mode === "delivery" ? "Delivery" : "Business travels";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
      <label className="flex items-center gap-3 font-semibold">
        <input
          checked={enabled}
          className="h-5 w-5 accent-[var(--lime)]"
          name={mode}
          onChange={(event) => setEnabled(event.target.checked)}
          type="checkbox"
        />
        {title}
      </label>
      {enabled ? (
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm text-white/60">
            Coverage
            <select
              className="min-h-12 rounded-xl border border-white/12 bg-[var(--panel)] px-4 text-white"
              name={`${mode}_scope`}
              onChange={(event) =>
                setScope(
                  event.target.value as Service["options"][number]["coverageScope"],
                )
              }
              value={scope}
            >
              <option value="selected_districts">Selected districts</option>
              <option value="selected_provinces">Selected provinces</option>
              <option value="nationwide">Nationwide</option>
            </select>
          </label>
          {scope === "selected_districts" ? (
            <fieldset className="grid gap-2 text-sm text-white/60">
              <legend>Districts</legend>
              <div className="grid max-h-52 gap-1 overflow-y-auto rounded-xl border border-white/12 bg-[var(--panel)] p-2 sm:grid-cols-2">
                {referenceData.provinces.flatMap((province) =>
                  province.districts.map((district) => (
                    <label
                      className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5"
                      key={district.id}
                    >
                      <input
                        className="accent-[var(--lime)]"
                        defaultChecked={current?.districtIds.includes(
                          district.id,
                        )}
                        name={`${mode}_districts`}
                        type="checkbox"
                        value={district.id}
                      />
                      <span>
                        {district.name}, {province.name}
                      </span>
                    </label>
                  )),
                )}
              </div>
            </fieldset>
          ) : null}
          {scope === "selected_provinces" ? (
            <fieldset className="grid gap-2 text-sm text-white/60">
              <legend>Provinces</legend>
              <div className="grid gap-1 rounded-xl border border-white/12 bg-[var(--panel)] p-2 sm:grid-cols-2">
                {referenceData.provinces.map((province) => (
                  <label
                    className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5"
                    key={province.id}
                  >
                    <input
                      className="accent-[var(--lime)]"
                      defaultChecked={current?.provinceIds.includes(
                        province.id,
                      )}
                      name={`${mode}_provinces`}
                      type="checkbox"
                      value={province.id}
                    />
                    {province.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm text-white/60">
              Fee from (ZMW)
              <input
                className="min-h-12 min-w-0 rounded-xl border border-white/12 bg-[var(--panel)] px-4 text-white"
                defaultValue={current?.feeMinimum ?? ""}
                min="0"
                name={`${mode}_fee_minimum`}
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm text-white/60">
              Fee to (ZMW)
              <input
                className="min-h-12 min-w-0 rounded-xl border border-white/12 bg-[var(--panel)] px-4 text-white"
                defaultValue={current?.feeMaximum ?? ""}
                min="0"
                name={`${mode}_fee_maximum`}
                step="0.01"
                type="number"
              />
            </label>
          </div>
          {mode === "delivery" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm text-white/60">
                Minimum days
                <input
                  className="min-h-12 min-w-0 rounded-xl border border-white/12 bg-[var(--panel)] px-4 text-white"
                  defaultValue={current?.leadTimeMinimumDays ?? ""}
                  min="0"
                  name={`${mode}_lead_minimum`}
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/60">
                Maximum days
                <input
                  className="min-h-12 min-w-0 rounded-xl border border-white/12 bg-[var(--panel)] px-4 text-white"
                  defaultValue={current?.leadTimeMaximumDays ?? ""}
                  min="0"
                  name={`${mode}_lead_maximum`}
                  type="number"
                />
              </label>
            </div>
          ) : null}
          <label className="grid gap-2 text-sm text-white/60">
            Coverage note (optional)
            <textarea
              className="min-h-20 rounded-xl border border-white/12 bg-[var(--panel)] px-4 py-3 text-white"
              defaultValue={current?.notes ?? ""}
              maxLength={500}
              name={`${mode}_notes`}
              placeholder="Example: Delivery fee depends on parcel size."
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export function CoverageForm({
  businessId,
  service,
  referenceData,
}: {
  businessId: string;
  service: Service;
  referenceData: ReferenceData;
}) {
  const action = saveCoverage.bind(null, businessId, service.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-5 grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["at_business", "Customers visit us"],
          ["customer_pickup", "Customer pickup"],
          ["remote", "Remote / online"],
        ].map(([mode, label]) => (
          <label
            className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-4 text-sm font-semibold"
            key={mode}
          >
            <input
              className="h-5 w-5 accent-[var(--lime)]"
              defaultChecked={Boolean(optionFor(service, mode))}
              name={mode}
              type="checkbox"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <GeographicCoverage
          mode="business_travel"
          referenceData={referenceData}
          service={service}
        />
        <GeographicCoverage
          mode="delivery"
          referenceData={referenceData}
          service={service}
        />
      </div>
      {state.message ? (
        <p
          className={`text-sm ${state.status === "success" ? "text-[var(--lime)]" : "text-red-200"}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <button
        className="button button-primary w-fit"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving…" : "Save service coverage"}
      </button>
    </form>
  );
}
