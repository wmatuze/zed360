import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  AdminLocationsApiError,
  fetchAdminLocations,
} from "@/lib/admin-locations";
import { getVerifiedSession } from "@/lib/authenticated-session";
import {
  submitDistrict,
  submitLocationStatus,
  submitProvince,
} from "./actions";
import { LocationStatusButton } from "./status-button";

export const metadata: Metadata = {
  title: "Province and district administration",
};
export const dynamic = "force-dynamic";
const messages: Record<string, string> = {
  "province-created": "The province was created.",
  "province-updated": "The province was updated.",
  "district-created": "The district was created.",
  "district-updated": "The district was updated.",
  activated: "The location is available for new selections.",
  deactivated:
    "The location is hidden from new selections; existing records remain intact.",
  invalid: "Check the location name, slug, and province.",
  "invalid-status": "Provide a reason of at least 10 characters.",
  forbidden: "Administrator access is required to change location data.",
  "not-found": "That province or district no longer exists.",
  conflict:
    "Resolve active districts or duplicate slugs before making this change.",
  unavailable: "The location change could not be saved.",
};

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    provinceId?: string;
    result?: string;
  }>;
}) {
  const params = await searchParams;
  const status =
    params.status === "active" || params.status === "inactive"
      ? params.status
      : "all";
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/locations");
  let result;
  try {
    result = await fetchAdminLocations(session.accessToken, {
      q: params.q?.trim(),
      status,
      provinceId: params.provinceId,
    });
  } catch (error) {
    if (error instanceof AdminLocationsApiError && error.status === 401)
      redirect("/admin/sign-in?next=/admin/locations&error=session_expired");
    return (
      <main className="mx-auto max-w-6xl px-5 py-14">
        <h1 className="text-4xl font-semibold">
          {error instanceof AdminLocationsApiError && error.status === 403
            ? "Reviewer access required."
            : "Location data unavailable."}
        </h1>
      </main>
    );
  }
  const canManage = result.viewerRole === "admin";
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 lg:px-10">
      <p className="eyebrow">
        <span /> Geographic reference data
      </p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.05em]">
            Provinces and districts.
          </h1>
          <p className="mt-3 max-w-2xl text-white/48">
            Maintain Zambia’s location hierarchy without breaking existing
            businesses, coverage areas, or requests.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-full border border-white/10 px-4 py-2 text-white/55">
            {result.totalProvinces} provinces
          </span>
          <span className="rounded-full border border-white/10 px-4 py-2 text-white/55">
            {result.totalDistricts} districts
          </span>
        </div>
      </div>
      {canManage ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <CreatePanel title="Add a province">
            <form
              action={submitProvince.bind(null, null)}
              className="grid gap-3 border-t border-white/8 p-5"
            >
              <LocationFields />
              <button className="button button-primary justify-self-start">
                Create province
              </button>
            </form>
          </CreatePanel>
          <CreatePanel title="Add a district">
            <form
              action={submitDistrict.bind(null, null)}
              className="grid gap-3 border-t border-white/8 p-5"
            >
              <ProvinceSelect provinces={result.provinces} />
              <LocationFields />
              <button className="button button-primary justify-self-start">
                Create district
              </button>
            </form>
          </CreatePanel>
        </div>
      ) : (
        <p className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
          Reviewers can inspect usage; only administrators can change reference
          data.
        </p>
      )}
      <form className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <input
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          defaultValue={params.q}
          name="q"
          placeholder="Search province, district, or slug"
        />
        <select
          className="rounded-xl border border-white/10 bg-[var(--panel)] px-4"
          defaultValue={status}
          name="status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="button button-primary">Filter</button>
      </form>
      {params.result && messages[params.result] ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          {messages[params.result]}
        </p>
      ) : null}
      <div className="mt-8 space-y-4">
        {result.provinces.map((province) => (
          <details
            className="rounded-2xl border border-white/10"
            key={province.id}
          >
            <summary className="grid cursor-pointer list-none gap-2 px-5 py-4 hover:bg-white/[0.035] sm:grid-cols-[1fr_auto_auto]">
              <div>
                <p className="font-semibold">{province.name}</p>
                <p className="text-sm text-white/40">/{province.slug}</p>
              </div>
              <span className="text-sm text-white/45">
                {province.districtCount} districts · {province.coverageCount}{" "}
                coverage areas
              </span>
              <span
                className={
                  province.isActive
                    ? "text-sm text-[var(--lime)]"
                    : "text-sm text-amber-200"
                }
              >
                {province.isActive ? "active" : "inactive"}
              </span>
            </summary>
            <div className="border-t border-white/8 bg-black/15 p-5">
              {canManage ? (
                <EntityControls
                  entity="provinces"
                  id={province.id}
                  active={province.isActive}
                >
                  <form
                    action={submitProvince.bind(null, province.id)}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <LocationFields name={province.name} slug={province.slug} />
                    <button className="button button-quiet justify-self-start sm:col-span-2">
                      Save province
                    </button>
                  </form>
                </EntityControls>
              ) : null}
              <div className="mt-5 overflow-hidden rounded-xl border border-white/8">
                {province.districts.length ? (
                  province.districts.map((district) => (
                    <details
                      className="border-b border-white/8 last:border-0"
                      key={district.id}
                    >
                      <summary className="grid cursor-pointer list-none gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_auto]">
                        <div>
                          <p className="font-medium">{district.name}</p>
                          <p className="text-xs text-white/35">
                            /{district.slug}
                          </p>
                        </div>
                        <span className="text-sm text-white/40">
                          {district.locationCount} locations ·{" "}
                          {district.requestCount} requests ·{" "}
                          {district.coverageCount} coverage
                        </span>
                        <span
                          className={
                            district.isActive
                              ? "text-sm text-[var(--lime)]"
                              : "text-sm text-amber-200"
                          }
                        >
                          {district.isActive ? "active" : "inactive"}
                        </span>
                      </summary>
                      {canManage ? (
                        <div className="border-t border-white/8 p-4">
                          <EntityControls
                            entity="districts"
                            id={district.id}
                            active={district.isActive}
                          >
                            <form
                              action={submitDistrict.bind(null, district.id)}
                              className="grid gap-3 sm:grid-cols-2"
                            >
                              <ProvinceSelect
                                defaultValue={province.id}
                                provinces={result.provinces}
                              />
                              <LocationFields
                                name={district.name}
                                slug={district.slug}
                              />
                              <button className="button button-quiet justify-self-start sm:col-span-2">
                                Save district
                              </button>
                            </form>
                          </EntityControls>
                        </div>
                      ) : null}
                    </details>
                  ))
                ) : (
                  <p className="p-4 text-sm text-white/40">
                    No districts match these filters.
                  </p>
                )}
              </div>
            </div>
          </details>
        ))}
        {!result.provinces.length ? (
          <p className="rounded-xl border border-white/10 p-5 text-white/45">
            No locations match these filters.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function CreatePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/[0.035]">
      <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[var(--lime)]">
        {title}
      </summary>
      {children}
    </details>
  );
}
function LocationFields({ name, slug }: { name?: string; slug?: string }) {
  return (
    <>
      <label>
        <span className="mb-1 block text-sm text-white/55">Name</span>
        <input
          className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"
          defaultValue={name}
          maxLength={120}
          minLength={2}
          name="name"
          required
        />
      </label>
      <label>
        <span className="mb-1 block text-sm text-white/55">URL slug</span>
        <input
          className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"
          defaultValue={slug}
          maxLength={120}
          minLength={2}
          name="slug"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
        />
      </label>
    </>
  );
}
function ProvinceSelect({
  provinces,
  defaultValue = "",
}: {
  provinces: Array<{ id: string; name: string; isActive: boolean }>;
  defaultValue?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm text-white/55">Province</span>
      <select
        className="h-11 w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3"
        defaultValue={defaultValue}
        name="provinceId"
        required
      >
        <option value="">Select province</option>
        {provinces.map((province) => (
          <option
            disabled={!province.isActive}
            key={province.id}
            value={province.id}
          >
            {province.name}
            {province.isActive ? "" : " (inactive)"}
          </option>
        ))}
      </select>
    </label>
  );
}
function EntityControls({
  entity,
  id,
  active,
  children,
}: {
  entity: "provinces" | "districts";
  id: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      {children}
      <form
        action={submitLocationStatus.bind(null, entity, id)}
        className="mt-4 flex flex-wrap gap-3"
      >
        <input
          className="min-w-[16rem] flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
          minLength={10}
          name="reason"
          placeholder="Reason for changing availability"
          required
        />
        <LocationStatusButton active={active} />
      </form>
    </div>
  );
}
