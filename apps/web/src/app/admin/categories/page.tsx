import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  AdminCategoriesApiError,
  fetchAdminCategories,
} from "@/lib/admin-categories";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { changeCategoryStatus, saveCategory } from "./actions";
import { CategoryStatusButton } from "./category-status-button";

export const metadata: Metadata = { title: "Category administration" };
export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  created: "The category was created.",
  updated: "The category details were updated.",
  activated: "The category is now available for new selections.",
  deactivated:
    "The category is hidden from new selections. Existing records are preserved.",
  invalid: "Check the category name, slug, parent, and display order.",
  "invalid-status": "Provide a reason of at least 10 characters.",
  forbidden: "Administrator access is required to change categories.",
  "not-found": "That category or parent category no longer exists.",
  conflict:
    "The change conflicts with the hierarchy or an existing slug. Check active subcategories and try again.",
  unavailable: "The category change could not be saved.",
};

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; result?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status =
    params.status === "active" || params.status === "inactive"
      ? params.status
      : "all";
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/categories");

  let result;
  try {
    result = await fetchAdminCategories(session.accessToken, { q, status });
  } catch (error) {
    if (error instanceof AdminCategoriesApiError && error.status === 401) {
      redirect("/admin/sign-in?next=/admin/categories&error=session_expired");
    }
    const denied =
      error instanceof AdminCategoriesApiError && error.status === 403;
    return (
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 lg:px-10">
        <h1 className="text-4xl font-semibold">
          {denied ? "Reviewer access required." : "Categories unavailable."}
        </h1>
      </main>
    );
  }

  const canManage = result.viewerRole === "admin";
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 lg:px-10">
      <p className="eyebrow">
        <span /> Discovery structure
      </p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.05em]">
            Categories and subcategories.
          </h1>
          <p className="mt-3 max-w-2xl text-white/48">
            Keep business services, customer requests, and public discovery on
            one controlled two-level hierarchy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Stat value={result.total} label="total" />
          <Stat value={result.active} label="active" active />
          <Stat value={result.inactive} label="inactive" />
        </div>
      </div>

      {canManage ? (
        <details className="mt-8 rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/[0.035]">
          <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[var(--lime)]">
            Add a category or subcategory
          </summary>
          <form
            action={saveCategory.bind(null, null)}
            className="grid gap-4 border-t border-white/8 p-5 lg:grid-cols-2"
          >
            <CategoryFields parents={result.parents} />
            <div className="lg:col-span-2">
              <button className="button button-primary" type="submit">
                Create category
              </button>
            </div>
          </form>
        </details>
      ) : (
        <p className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
          Reviewers can inspect category usage. Only administrators can make
          changes.
        </p>
      )}

      <form className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <input
          className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[var(--lime)]/45"
          defaultValue={q}
          name="q"
          placeholder="Search category, slug, or parent"
        />
        <select
          className="rounded-xl border border-white/10 bg-[var(--panel)] px-4 py-3"
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

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        {result.categories.length ? (
          result.categories.map((category) => (
            <details
              className="group border-b border-white/8 last:border-b-0"
              key={category.id}
            >
              <summary className="grid cursor-pointer list-none gap-2 px-5 py-4 transition hover:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {category.parentId ? "↳ " : ""}
                    {category.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-white/40">
                    /{category.slug}
                    {category.parentName ? ` · ${category.parentName}` : ""}
                  </p>
                </div>
                <span className="text-sm text-white/45">
                  {category.serviceCount} services · {category.requestCount}{" "}
                  requests
                </span>
                <span
                  className={
                    category.isActive
                      ? "text-sm text-[var(--lime)]"
                      : "text-sm text-amber-200"
                  }
                >
                  {category.isActive ? "active" : "inactive"}
                </span>
              </summary>
              <div className="border-t border-white/8 bg-black/15 px-5 py-5">
                <div className="grid gap-3 text-sm text-white/50 sm:grid-cols-3">
                  <p>Display order: {category.sortOrder}</p>
                  <p>{category.childCount} subcategories</p>
                  <p>
                    Updated {new Date(category.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                {category.description ? (
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-white/55">
                    {category.description}
                  </p>
                ) : null}
                {canManage ? (
                  <CategoryControls
                    category={category}
                    parents={result.parents.filter(
                      (parent) => parent.id !== category.id,
                    )}
                  />
                ) : null}
              </div>
            </details>
          ))
        ) : (
          <p className="p-6 text-white/45">
            No categories match these filters.
          </p>
        )}
      </div>
    </main>
  );
}

type CategoryValue = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};
type ParentValue = { id: string; name: string; isActive: boolean };

function Stat({
  value,
  label,
  active = false,
}: {
  value: number;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-4 py-2 ${active ? "border-[var(--lime)]/20 text-[var(--lime)]" : "border-white/10 text-white/45"}`}
    >
      {value} {label}
    </span>
  );
}

function CategoryControls({
  category,
  parents,
}: {
  category: CategoryValue;
  parents: ParentValue[];
}) {
  return (
    <>
      <form
        action={saveCategory.bind(null, category.id)}
        className="mt-5 grid gap-4 border-t border-white/8 pt-5 lg:grid-cols-2"
      >
        <CategoryFields category={category} parents={parents} />
        <div className="lg:col-span-2">
          <button className="button button-quiet" type="submit">
            Save details
          </button>
        </div>
      </form>
      <form
        action={changeCategoryStatus.bind(null, category.id)}
        className="mt-5 flex flex-wrap gap-3 border-t border-white/8 pt-5"
      >
        <input
          className="min-w-[16rem] flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
          minLength={10}
          name="reason"
          placeholder="Reason for changing availability"
          required
        />
        <CategoryStatusButton
          action={category.isActive ? "deactivated" : "activated"}
        />
      </form>
    </>
  );
}

function CategoryFields({
  category,
  parents,
}: {
  category?: Omit<CategoryValue, "id" | "isActive">;
  parents: ParentValue[];
}) {
  return (
    <>
      <Field label="Name">
        <input
          className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"
          defaultValue={category?.name}
          maxLength={120}
          minLength={2}
          name="name"
          required
        />
      </Field>
      <Field label="URL slug">
        <input
          className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"
          defaultValue={category?.slug}
          maxLength={120}
          minLength={2}
          name="slug"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="solar-installation"
          required
        />
      </Field>
      <Field label="Parent category">
        <select
          className="h-11 w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3"
          defaultValue={category?.parentId ?? ""}
          name="parentId"
        >
          <option value="">Top-level category</option>
          {parents.map((parent) => (
            <option
              disabled={!parent.isActive}
              key={parent.id}
              value={parent.id}
            >
              {parent.name}
              {parent.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Display order">
        <input
          className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"
          defaultValue={category?.sortOrder ?? 0}
          max={10000}
          min={0}
          name="sortOrder"
          required
          type="number"
        />
      </Field>
      <label className="block lg:col-span-2">
        <span className="mb-2 block text-sm text-white/55">Description</span>
        <textarea
          className="min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
          defaultValue={category?.description ?? ""}
          maxLength={600}
          name="description"
        />
      </label>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/55">{label}</span>
      {children}
    </label>
  );
}
