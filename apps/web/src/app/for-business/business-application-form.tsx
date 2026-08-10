"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
type CreatedApplication = {
  id: string;
  status: "draft";
  createdAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export function BusinessApplicationForm() {
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(
    null,
  );
  const [referenceError, setReferenceError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("not_sure");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [application, setApplication] = useState<CreatedApplication | null>(
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
        if (!response.ok) throw new Error("Reference data is unavailable.");
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
  }, [loadAttempt]);

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
    const payload = {
      businessName: value("businessName"),
      description: value("description") || undefined,
      categoryId: value("categoryId"),
      serviceName: value("serviceName"),
      districtId: value("districtId"),
      address: value("address") || undefined,
      phone: value("phone") || undefined,
      whatsapp: value("whatsapp") || undefined,
      email: value("email") || undefined,
      website: value("website") || undefined,
      registrationStatus,
      registeredLegalName: value("registeredLegalName") || undefined,
      registrationNumber: value("registrationNumber") || undefined,
      entityType: value("entityType") || undefined,
      representativeConfirmed: form.get("representativeConfirmed") === "on",
    };

    try {
      const response = await fetch(`${apiUrl}/business-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as CreatedApplication & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(
          result.message ?? "Your application could not be submitted.",
        );
      }
      setApplication(result);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Your application could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (application) {
    return (
      <div className="rounded-3xl border border-[var(--lime)]/25 bg-[var(--lime)]/8 p-8 sm:p-10">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--lime)] font-bold text-[var(--ink)]">
          ✓
        </span>
        <h2 className="mt-6 text-2xl font-semibold tracking-[-0.035em]">
          Your business application is saved.
        </h2>
        <p className="mt-3 leading-7 text-white/60">
          The profile remains private while Zed360 reviews the information and
          confirms that you represent the business.
        </p>
        <p className="mt-4 text-sm text-white/42">
          Application reference: {application.id.slice(0, 8).toUpperCase()}
        </p>
      </div>
    );
  }

  const loading = !referenceData && !referenceError;
  const inputClass =
    "h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55";
  const selectClass =
    "h-12 w-full rounded-xl border border-white/10 bg-[#11151d] px-4 outline-none transition focus:border-[var(--lime)]/55";

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
            className="mt-2 font-semibold text-white underline decoration-white/40 underline-offset-4"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Trading or public business name
        </span>
        <input
          className={inputClass}
          maxLength={120}
          name="businessName"
          required
        />
      </label>

      <fieldset className="rounded-2xl border border-white/8 bg-black/10 p-4 sm:p-5">
        <legend className="px-1 text-sm font-medium text-white/70">
          PACRA registration
        </legend>
        <label className="mt-2 block">
          <span className="mb-2 block text-xs leading-5 text-white/40">
            Is this business registered with PACRA? Registration is a separate
            trust signal and is not required to submit an application.
          </span>
          <select
            className={selectClass}
            name="registrationStatus"
            onChange={(event) => setRegistrationStatus(event.target.value)}
            value={registrationStatus}
          >
            <option value="not_sure">I am not sure</option>
            <option value="registered">Yes, it is registered</option>
            <option value="not_registered">No, it is not registered</option>
          </select>
        </label>

        {registrationStatus === "registered" ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-medium text-white/70">
                Exact registered legal name
              </span>
              <input
                className={inputClass}
                maxLength={160}
                name="registeredLegalName"
                placeholder="Enter the name exactly as registered"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/70">
                PACRA registration number
              </span>
              <input
                className={inputClass}
                maxLength={80}
                name="registrationNumber"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/70">
                Registered entity type
              </span>
              <select
                className={selectClass}
                defaultValue=""
                name="entityType"
                required
              >
                <option disabled value="">
                  Select entity type
                </option>
                <option value="business_name">Business name</option>
                <option value="local_company">Local company</option>
                <option value="foreign_company">Foreign company</option>
                <option value="other">Other</option>
              </select>
            </label>
            <p className="text-xs leading-5 text-white/35 sm:col-span-2">
              These details enter a pending review. They do not create a PACRA
              verification badge automatically.
            </p>
          </div>
        ) : null}
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          What does the business do?
        </span>
        <textarea
          className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
          maxLength={1200}
          name="description"
          placeholder="A short, factual description of the business"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/70">
            Main category
          </span>
          <select
            className={selectClass}
            defaultValue=""
            disabled={loading || Boolean(referenceError)}
            name="categoryId"
            required
          >
            <option disabled value="">
              {loading ? "Loading categories…" : "Select a category"}
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
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/70">
            Main service
          </span>
          <input
            className={inputClass}
            maxLength={120}
            name="serviceName"
            placeholder="Example: Solar installation"
            required
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/70">
            Province served
          </span>
          <select
            className={selectClass}
            disabled={loading || Boolean(referenceError)}
            onChange={(event) => {
              setProvinceId(event.target.value);
              setDistrictId("");
            }}
            required
            value={provinceId}
          >
            <option disabled value="">
              {loading ? "Loading provinces…" : "Select a province"}
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
            Primary district served
          </span>
          <select
            className={selectClass}
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

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/70">
          Address or service-area note{" "}
          <i className="font-normal text-white/30">optional</i>
        </span>
        <input
          className={inputClass}
          maxLength={500}
          name="address"
          placeholder="Example: Serves Lusaka and nearby areas"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-white/70">
          How should Zed360 contact you?
        </legend>
        <p className="mb-3 text-xs text-white/35">
          Provide at least one contact method. It will not be published before
          review.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <input
            className={inputClass}
            maxLength={160}
            name="phone"
            placeholder="Phone"
            type="tel"
          />
          <input
            className={inputClass}
            maxLength={160}
            name="whatsapp"
            placeholder="WhatsApp"
            type="tel"
          />
          <input
            className={inputClass}
            maxLength={254}
            name="email"
            placeholder="Email"
            type="email"
          />
          <input
            className={inputClass}
            maxLength={500}
            name="website"
            placeholder="Website (optional)"
            type="url"
          />
        </div>
      </fieldset>

      <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-black/15 p-4 text-sm leading-6 text-white/55">
        <input
          className="mt-1 h-4 w-4 accent-[var(--lime)]"
          name="representativeConfirmed"
          required
          type="checkbox"
        />
        <span>
          I own or am authorised to represent this business. I understand that
          submission does not mean the business is verified or publicly listed.
        </span>
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
        disabled={submitting || loading || Boolean(referenceError)}
        type="submit"
      >
        {submitting ? "Saving application…" : "Submit business application"}
        {!submitting ? <span aria-hidden="true">→</span> : null}
      </button>
    </form>
  );
}
