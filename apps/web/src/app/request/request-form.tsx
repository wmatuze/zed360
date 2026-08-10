"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type District = { id: string; name: string; slug: string };
type Province = {
  id: string;
  name: string;
  slug: string;
  districts: District[];
};
type Category = {
  id: string;
  name: string;
  slug: string;
  children: Array<{ id: string; name: string; slug: string }>;
};
type ReferenceData = { provinces: Province[]; categories: Category[] };
type CreatedRequest = {
  id: string;
  shareToken: string;
  status: "open";
  createdAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export function RequestForm() {
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(
    null,
  );
  const [referenceError, setReferenceError] = useState("");
  const [referenceLoadAttempt, setReferenceLoadAttempt] = useState(0);
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [timing, setTiming] = useState("as_soon_as_possible");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdRequest, setCreatedRequest] = useState<CreatedRequest | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadReferenceData() {
      setReferenceError("");
      try {
        const response = await fetch(`${apiUrl}/reference-data`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Reference data is temporarily unavailable.");
        }
        setReferenceData((await response.json()) as ReferenceData);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setReferenceError(
            "We could not connect to Zed360 services. Check that the app is running, then try again.",
          );
        }
      }
    }

    void loadReferenceData();
    return () => controller.abort();
  }, [referenceLoadAttempt]);

  const districts = useMemo(
    () =>
      referenceData?.provinces.find((province) => province.id === provinceId)
        ?.districts ?? [],
    [provinceId, referenceData],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const optionalNumber = (name: string) => {
      const rawValue = value(name);
      return rawValue === "" ? undefined : Number(rawValue);
    };
    const neededDate = value("neededAt");

    const request = {
      summary: value("summary"),
      categoryId: value("categoryId"),
      districtId: value("districtId"),
      timing,
      neededAt:
        timing === "specific_date" && neededDate
          ? `${neededDate}T00:00:00+02:00`
          : undefined,
      budgetMinimum: optionalNumber("budgetMinimum"),
      budgetMaximum: optionalNumber("budgetMaximum"),
      details: value("details") || undefined,
      categoryAnswers: {},
    };

    try {
      const response = await fetch(`${apiUrl}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const result = (await response.json()) as CreatedRequest & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Your request could not be submitted. Please try again.",
        );
      }

      setCreatedRequest(result);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Your request could not be submitted. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function createAnotherRequest() {
    setCreatedRequest(null);
    setProvinceId("");
    setDistrictId("");
    setTiming("as_soon_as_possible");
    setSubmitError("");
  }

  if (createdRequest) {
    return (
      <div className="rounded-3xl border border-[var(--lime)]/25 bg-[var(--lime)]/8 p-8 sm:p-10">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--lime)] font-bold text-[var(--ink)]">
          ✓
        </span>
        <h2 className="mt-6 text-2xl font-semibold tracking-[-0.035em]">
          Your request is now open.
        </h2>
        <p className="mt-3 leading-7 text-white/60">
          Zed360 received your request successfully. Use your private page to
          check and compare responses from approved businesses.
        </p>
        <p className="mt-4 text-sm text-white/42">
          Request reference: {createdRequest.id.slice(0, 8).toUpperCase()}
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white/55">
          Save the private link below. Anyone with the link can see this request
          and its business responses, so do not post it publicly.
        </div>
        <Link
          className="button button-primary mt-6"
          href={`/request/${createdRequest.shareToken}`}
        >
          View my private request →
        </Link>
        <button
          className="button button-secondary ml-0 mt-3 sm:ml-3 sm:mt-6"
          onClick={createAnotherRequest}
          type="button"
        >
          Post another request
        </button>
      </div>
    );
  }

  const dataLoading = !referenceData && !referenceError;

  return (
    <form
      className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl sm:p-8"
      onSubmit={handleSubmit}
    >
      {referenceError ? (
        <div
          className="rounded-xl border border-red-300/20 bg-red-300/8 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          <p>{referenceError}</p>
          <button
            className="mt-2 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
            onClick={() => setReferenceLoadAttempt((attempt) => attempt + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          What do you need?
        </span>
        <textarea
          className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
          maxLength={240}
          minLength={10}
          name="summary"
          placeholder="Example: I need a solar installer for a three-bedroom house"
          required
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Category
        </span>
        <select
          className="h-12 w-full rounded-xl border border-white/10 bg-[#11151d] px-4 outline-none transition focus:border-[var(--lime)]/55"
          disabled={dataLoading || Boolean(referenceError)}
          name="categoryId"
          required
          defaultValue=""
        >
          <option disabled value="">
            {dataLoading ? "Loading categories…" : "Select a category"}
          </option>
          {referenceData?.categories.map((category) => (
            <optgroup key={category.id} label={category.name}>
              <option value={category.id}>{category.name} — general</option>
              {category.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/70">
            Province
          </span>
          <select
            className="h-12 w-full rounded-xl border border-white/10 bg-[#11151d] px-4 outline-none transition focus:border-[var(--lime)]/55"
            disabled={dataLoading || Boolean(referenceError)}
            onChange={(event) => {
              setProvinceId(event.target.value);
              setDistrictId("");
            }}
            required
            value={provinceId}
          >
            <option disabled value="">
              {dataLoading ? "Loading provinces…" : "Select a province"}
            </option>
            {referenceData?.provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/70">
            District
          </span>
          <select
            className="h-12 w-full rounded-xl border border-white/10 bg-[#11151d] px-4 outline-none transition focus:border-[var(--lime)]/55"
            disabled={!provinceId}
            name="districtId"
            onChange={(event) => setDistrictId(event.target.value)}
            required
            value={districtId}
          >
            <option disabled value="">
              {provinceId ? "Select a district" : "Choose a province first"}
            </option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/70">
            When do you need it?
          </span>
          <select
            className="h-12 w-full rounded-xl border border-white/10 bg-[#11151d] px-4 outline-none transition focus:border-[var(--lime)]/55"
            onChange={(event) => setTiming(event.target.value)}
            value={timing}
          >
            <option value="as_soon_as_possible">As soon as possible</option>
            <option value="today">Today</option>
            <option value="this_week">This week</option>
            <option value="specific_date">On a specific date</option>
            <option value="flexible">I am flexible</option>
          </select>
        </label>
        {timing === "specific_date" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/70">
              Needed date
            </span>
            <input
              className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none transition focus:border-[var(--lime)]/55"
              min={new Date().toISOString().slice(0, 10)}
              name="neededAt"
              required
              type="date"
            />
          </label>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-white/70">
          Budget range <i className="font-normal text-white/30">optional</i>
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className="sr-only">Minimum budget</span>
            <input
              className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
              min="0"
              name="budgetMinimum"
              placeholder="Minimum, e.g. K1,000"
              step="1"
              type="number"
            />
          </label>
          <label>
            <span className="sr-only">Maximum budget</span>
            <input
              className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
              min="0"
              name="budgetMaximum"
              placeholder="Maximum, e.g. K3,000"
              step="1"
              type="number"
            />
          </label>
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Anything else businesses should know?{" "}
          <i className="font-normal text-white/30">optional</i>
        </span>
        <textarea
          className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
          maxLength={2000}
          name="details"
          placeholder="Measurements, preferred brands, delivery requirements, or other useful details"
        />
      </label>
      {submitError ? (
        <p
          className="rounded-xl border border-red-300/20 bg-red-300/8 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}
      <button
        className="button button-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        disabled={submitting || dataLoading || Boolean(referenceError)}
        type="submit"
      >
        {submitting ? "Submitting request…" : "Post this request"}{" "}
        {!submitting ? <span aria-hidden="true">→</span> : null}
      </button>
      <p className="text-xs leading-5 text-white/28">
        Submitting a request will not create a purchase or payment obligation.
      </p>
    </form>
  );
}
