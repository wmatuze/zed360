"use client";

import type {
  BusinessServiceManagement,
  ReferenceData,
} from "@zed360/contracts";
import { useActionState } from "react";
import { saveService, type ServiceActionState } from "./actions";

const initial: ServiceActionState = { status: "idle", message: "" };
type Service = BusinessServiceManagement["services"][number];

function Message({ state }: { state: ServiceActionState }) {
  return state.message ? (
    <p
      aria-live="polite"
      className={`rounded-xl border p-3 text-sm ${state.status === "success" ? "border-[var(--lime)]/25 bg-[var(--lime)]/8" : "border-red-300/20 bg-red-300/8 text-red-100"}`}
    >
      {state.message}
    </p>
  ) : null;
}

function ServiceFields({
  referenceData,
  service,
}: {
  referenceData: ReferenceData;
  service?: Service;
}) {
  return (
    <>
      <label className="text-sm text-white/65">
        Service name
        <input
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"
          defaultValue={service?.name ?? ""}
          maxLength={120}
          name="name"
          placeholder="For example: Emergency plumbing"
          required
        />
      </label>
      <label className="text-sm text-white/65">
        Category
        <select
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#10141c] px-4"
          defaultValue={service?.categoryId ?? ""}
          name="categoryId"
          required
        >
          <option disabled value="">
            Select a category
          </option>
          {referenceData.categories.map((category) => (
            <optgroup key={category.id} label={category.name}>
              {(category.children.length ? category.children : [category]).map(
                (option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ),
              )}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="text-sm text-white/65">
        Description
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-4"
          defaultValue={service?.description ?? ""}
          maxLength={2000}
          name="description"
          placeholder="What is included and what should customers know?"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/65">
          Price from (ZMW)
          <input
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"
            defaultValue={service?.priceFrom ?? ""}
            min="0"
            name="priceFrom"
            step="0.01"
            type="number"
          />
        </label>
        <label className="text-sm text-white/65">
          Price to (ZMW)
          <input
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"
            defaultValue={service?.priceTo ?? ""}
            min="0"
            name="priceTo"
            step="0.01"
            type="number"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-5 text-sm text-white/65">
        <label className="flex items-center gap-2">
          <input
            defaultChecked={service?.isAvailable ?? true}
            name="isAvailable"
            type="checkbox"
          />
          Currently available
        </label>
        {service ? (
          <label className="flex items-center gap-2">
            Status
            <select
              className="h-10 rounded-lg border border-white/10 bg-[#10141c] px-3"
              defaultValue={service.status}
              name="status"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        ) : (
          <input name="status" type="hidden" value="active" />
        )}
      </div>
    </>
  );
}

function ServiceCard({
  businessId,
  referenceData,
  service,
}: {
  businessId: string;
  referenceData: ReferenceData;
  service: Service;
}) {
  const [state, action, pending] = useActionState(
    saveService.bind(null, businessId, service.id),
    initial,
  );
  return (
    <article
      className={`rounded-3xl border p-6 ${service.status === "active" ? "border-white/10 bg-white/[0.035]" : "border-white/6 bg-white/[0.015] opacity-70"}`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[.14em] text-[var(--lime)]">
            {service.categoryName}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{service.name}</h2>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
          {service.status === "archived"
            ? "Archived"
            : service.isAvailable
              ? "Available"
              : "Unavailable"}
        </span>
      </div>
      <form action={action} className="grid gap-4">
        <ServiceFields referenceData={referenceData} service={service} />
        <Message state={state} />
        <div className="flex flex-wrap gap-2">
          <button className="button button-secondary" disabled={pending}>
            {pending ? "Saving…" : "Save service"}
          </button>
          {service.status === "active" ? (
            <a
              className="button button-quiet"
              href={`/business/${businessId}/coverage`}
            >
              {service.coverageModes ? "Edit coverage" : "Add coverage"}
            </a>
          ) : null}
        </div>
      </form>
    </article>
  );
}

export function ServiceManager({
  businessId,
  referenceData,
  services,
}: {
  businessId: string;
  referenceData: ReferenceData;
  services: Service[];
}) {
  const [state, action, pending] = useActionState(
    saveService.bind(null, businessId, null),
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
            New service
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Add a service</h2>
        </div>
        <ServiceFields referenceData={referenceData} />
        <Message state={state} />
        <button className="button button-primary w-fit" disabled={pending}>
          {pending ? "Adding…" : "Add service"}
        </button>
      </form>
      <div className="grid gap-5">
        {services.map((service) => (
          <ServiceCard
            businessId={businessId}
            key={service.id}
            referenceData={referenceData}
            service={service}
          />
        ))}
        {!services.length ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-sm text-white/50">
            No services yet. Add the first service to start matching with
            customer requests.
          </p>
        ) : null}
      </div>
    </div>
  );
}
