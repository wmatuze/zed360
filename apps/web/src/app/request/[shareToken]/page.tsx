import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { notFound } from "next/navigation";
import {
  CustomerRequestApiError,
  fetchSharedCustomerRequest,
} from "@/lib/customer-request";
import { PrivateRequestActions } from "../private-request-actions";
import { RememberRequest } from "./remember-request";
import {
  RequestClosureControls,
  ResponseOutcomeControls,
} from "./request-outcome-controls";
import { CustomerReviewForm } from "./customer-review-form";

export const metadata: Metadata = { title: "Your request responses" };
export const dynamic = "force-dynamic";

const responseLabels = {
  available: "Available",
  unavailable: "Unavailable",
  needs_more_information: "Needs more information",
} as const;

function moneyRange(minimum: number | null, maximum: number | null) {
  const format = new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
    maximumFractionDigits: 0,
  });
  if (minimum !== null && maximum !== null)
    return `${format.format(minimum)} – ${format.format(maximum)}`;
  if (minimum !== null) return `From ${format.format(minimum)}`;
  if (maximum !== null) return `Up to ${format.format(maximum)}`;
  return "Ask the business for pricing";
}

function whatsappHref(value: string | null) {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `260${digits.slice(1)}`;
  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
}

function websiteHref(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }

}

export default async function SharedRequestPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  let data;
  try {
    data = await fetchSharedCustomerRequest(shareToken);
  } catch (error) {
    if (error instanceof CustomerRequestApiError && error.status === 404) {
      notFound();
    }
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--ink)] px-5 text-white">
        <div className="max-w-lg rounded-2xl border border-red-300/20 bg-red-300/8 p-7">
          <h1 className="text-xl font-semibold">
            We could not load this request.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Please check the private link or try again when the Zed360 service
            is available.
          </p>
        </div>
      </main>
    );
  }

  const requestClosed =
    data.request.status === "resolved" ||
    data.request.status === "cancelled" ||
    data.request.status === "expired";
  const selectedBusiness = data.responses.find(
    (response) => response.business.id === data.outcome.selectedBusinessId,
  );

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <RememberRequest
        request={{
          id: data.request.id,
          summary: data.request.summary,
          createdAt: data.request.createdAt,
        }}
        shareToken={shareToken}
      />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo />
        </Link>
        <Link className="button button-quiet" href="/request">
          Post another request
        </Link>
      </header>

      <section className="mx-auto w-full max-w-5xl pb-20 pt-14 lg:pt-20">
        <p className="eyebrow">
          <span /> Private request
        </p>
        <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
          {data.request.summary}
        </h1>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/48">
          <span>{data.request.categoryName}</span>
          <span>{data.request.districtName ?? "Location not specified"}</span>
          <span>
            Posted{" "}
            {new Date(data.request.createdAt).toLocaleDateString("en-ZM", {
              dateStyle: "medium",
            })}
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 p-5 text-sm leading-6 text-white/65">
          Keep this page private. Anyone with its link can view your request,
          compare responses, and record your decision.
          <PrivateRequestActions
            shareToken={shareToken}
            summary={data.request.summary}
          />
        </div>

        {requestClosed ? (
          <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.045] p-5 text-sm leading-6 text-white/65">
            <strong className="block text-white">
              {data.request.status === "resolved"
                ? "Request completed"
                : data.request.status === "cancelled"
                  ? "Request closed"
                  : "Request expired"}
            </strong>
            {selectedBusiness
              ? `You selected ${selectedBusiness.business.name}. Your responses remain available on this private page.`
              : "Your responses remain available on this private page."}
          </div>
        ) : null}

        {data.request.status === "resolved" && selectedBusiness ? (
          <CustomerReviewForm
            businessName={selectedBusiness.business.name}
            review={data.review}
            shareToken={shareToken}
          />
        ) : null}

        <div className="mt-12 flex items-end justify-between gap-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em]">
              Business responses
            </h2>
            <p className="mt-2 text-sm text-white/45">
              Compare the offer, message, and contact options. Zed360 does not
              choose for you.
            </p>
          </div>
          <span className="text-sm text-white/38">
            {data.responses.length} received
          </span>
        </div>

        {data.responses.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {data.responses.map((response) => {
              const whatsapp = whatsappHref(response.business.whatsapp);
              const website = websiteHref(response.business.website);
              return (
                <article
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-6"
                  key={response.matchId}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {response.business.name}
                      </h3>
                      {response.business.description ? (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/45">
                          {response.business.description}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${response.status === "available" ? "border-[var(--lime)]/25 bg-[var(--lime)]/8 text-[var(--lime)]" : "border-white/12 bg-white/5 text-white/60"}`}
                    >
                      {responseLabels[response.status]}
                    </span>
                  </div>

                  <p className="mt-5 text-2xl font-semibold tracking-[-0.035em]">
                    {moneyRange(response.priceMinimum, response.priceMaximum)}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/65">
                    {response.message}
                  </p>

                  {response.status !== "unavailable" ? (
                    <div className="mt-auto flex flex-wrap gap-2 pt-6">
                      {whatsapp ? (
                        <a
                          className="button button-primary"
                          href={whatsapp}
                          rel="noreferrer"
                          target="_blank"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      {response.business.phone ? (
                        <a
                          className="button button-secondary"
                          href={`tel:${response.business.phone}`}
                        >
                          Call
                        </a>
                      ) : null}
                      {response.business.email ? (
                        <a
                          className="button button-secondary"
                          href={`mailto:${response.business.email}`}
                        >
                          Email
                        </a>
                      ) : null}
                      {website ? (
                        <a
                          className="button button-secondary"
                          href={website}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Website
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {response.status !== "unavailable" ? (
                    <ResponseOutcomeControls
                      businessName={response.business.name}
                      contacted={data.outcome.contactedBusinessIds.includes(
                        response.business.id,
                      )}
                      matchId={response.matchId}
                      requestClosed={requestClosed}
                      selected={
                        data.outcome.selectedBusinessId === response.business.id
                      }
                      shareToken={shareToken}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-7">
            <p className="font-semibold">No responses yet</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">
              Keep this link and check again later. Responses from approved
              matching businesses will appear here.
            </p>
          </div>
        )}
        <RequestClosureControls
          requestStatus={data.request.status}
          shareToken={shareToken}
        />
      </section>
    </main>
  );
}
