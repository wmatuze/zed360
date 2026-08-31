import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { businessApplicationClaimTokenSchema } from "@zed360/contracts";
import { BrandLogo } from "@/components/brand-logo";
import {
  BusinessAccountApiError,
  fetchApplicationClaim,
  getVerifiedBusinessSession,
} from "@/lib/business-account";
import { connectApplication } from "./actions";
import { ConnectButton } from "./connect-button";

export const metadata: Metadata = { title: "Connect your business" };
export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  conflict:
    "This application is already connected to another account. Zed360 must review the ownership conflict.",
  invalid: "This application link is invalid or no longer available.",
  unavailable: "The application could not be connected. Please try again.",
};

export default async function BusinessClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; result?: string }>;
}) {
  const parameters = await searchParams;
  const parsedToken = businessApplicationClaimTokenSchema.safeParse(
    parameters.token,
  );
  const resultMessage = parameters.result
    ? resultMessages[parameters.result]
    : undefined;

  if (!parsedToken.success) {
    return <ClaimShell message={resultMessage ?? resultMessages.invalid} />;
  }

  const claimPath = `/business/claim?token=${encodeURIComponent(parsedToken.data)}`;
  const session = await getVerifiedBusinessSession();
  if (!session) {
    redirect(`/business/sign-in?next=${encodeURIComponent(claimPath)}`);
  }

  let application = null;
  let loadError = resultMessage ?? "";
  let sessionExpired = false;
  try {
    application = await fetchApplicationClaim(
      session.accessToken,
      parsedToken.data,
    );
  } catch (error) {
    if (error instanceof BusinessAccountApiError && error.status === 401) {
      sessionExpired = true;
    } else {
      loadError =
        error instanceof BusinessAccountApiError
          ? error.message
          : "The application could not be loaded.";
    }
  }

  if (sessionExpired) {
    redirect(
      `/business/sign-in?next=${encodeURIComponent(claimPath)}&error=session_expired`,
    );
  }

  if (!application) return <ClaimShell message={loadError} />;
  const connect = connectApplication.bind(null, parsedToken.data);

  return (
    <ClaimShell>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lime)]">
        Email verified
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">
        Connect {application.businessName}?
      </h1>
      <p className="mt-4 leading-7 text-white/55">
        Connect this application to the account signed in as{" "}
        <span className="font-medium text-white/80">
          {application.submittedEmail}
        </span>
        . This does not approve or publish the business.
      </p>

      {loadError ? (
        <p
          className="mt-5 rounded-xl border border-red-300/20 bg-red-300/8 px-4 py-3 text-sm text-red-100/80"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      {application.status === "already_connected" ? (
        <div className="mt-6">
          <p className="text-sm text-white/60">
            This business is already connected to your account.
          </p>
          <Link className="button button-primary mt-4" href="/business/account">
            View application status →
          </Link>
        </div>
      ) : (
        <form action={connect} className="mt-6">
          <ConnectButton />
        </form>
      )}
    </ClaimShell>
  );
}

function ClaimShell({
  children,
  message,
}: {
  children?: React.ReactNode;
  message?: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/">
          <BrandLogo />
        </Link>
        <span className="text-xs text-white/35">Business connection</span>
      </header>
      <section className="mx-auto w-full max-w-3xl pb-20 pt-16 lg:pt-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 sm:p-10">
          {message ? (
            <>
              <h1 className="text-2xl font-semibold">
                Application unavailable
              </h1>
              <p className="mt-3 leading-7 text-white/55">{message}</p>
              <Link
                className="button button-quiet mt-6"
                href="/business/account"
              >
                Open business account
              </Link>
            </>
          ) : (
            children
          )}
        </div>
      </section>
    </main>
  );
}
