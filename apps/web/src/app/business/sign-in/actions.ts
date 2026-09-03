"use server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(254);
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const neutralSuccessMessage =
  "If this email is connected to a submitted business, we will send a single-use sign-in link.";

export type SignInState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function requestSignInLink(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const next = safeNextPath(
    typeof formData.get("next") === "string"
      ? (formData.get("next") as string)
      : null,
  );
  const confirmationUrl = new URL("/auth/confirm", appUrl);
  confirmationUrl.searchParams.set("next", next);

  try {
    const eligibility = await getSignInEligibility(parsed.data);
    if (!eligibility.eligible) {
      return { status: "success", message: neutralSuccessMessage };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        emailRedirectTo: confirmationUrl.toString(),
        shouldCreateUser: eligibility.mayCreateUser,
      },
    });

    if (error) {
      console.error("[business-sign-in] Supabase rejected the OTP request", {
        code: error.code,
        message: error.message,
        status: error.status,
      });

      if (process.env.NODE_ENV !== "development") {
        return { status: "success", message: neutralSuccessMessage };
      }

      if (
        error.status === 429 ||
        error.code === "over_email_send_rate_limit" ||
        /rate limit|security purposes/i.test(error.message)
      ) {
        return {
          status: "error",
          message:
            "A sign-in email was requested recently. Wait about one minute, then request a new link.",
        };
      }

      return {
        status: process.env.NODE_ENV === "development" ? "error" : "success",
        message:
          process.env.NODE_ENV === "development"
            ? error.code === "email_address_not_authorized"
              ? "Supabase's test email service only sends to project team addresses. Configure custom SMTP before testing other business emails."
              : "We could not send the sign-in email. Check the server log for the provider response."
            : neutralSuccessMessage,
      };
    }

    return {
      status: "success",
      message: neutralSuccessMessage,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Supabase Auth is not configured")
    ) {
      return {
        status: "error",
        message:
          "Business sign-in is not configured yet. Complete the Supabase Auth setup first.",
      };
    }
    if (
      error instanceof Error &&
      error.message.startsWith("Business sign-in eligibility is not configured")
    ) {
      return {
        status: "error",
        message:
          "Business sign-in protection is not configured yet. Complete the internal access setup first.",
      };
    }

    console.error(
      "[business-sign-in] Unexpected sign-in failure",
      error instanceof Error ? error.message : "Unknown error",
    );
    return {
      status: "error",
      message:
        "Sign-in could not start because of an unexpected error. Please try again.",
    };
  }
}

async function getSignInEligibility(email: string) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret || internalSecret.length < 32) {
    throw new Error(
      "Business sign-in eligibility is not configured. Run the internal access setup first.",
    );
  }

  const response = await fetch(
    `${apiUrl}/business-account/sign-in-eligibility`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-zed360-internal-secret": internalSecret,
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error("Business sign-in eligibility could not be checked.");
  }

  const body = (await response.json().catch(() => null)) as {
    eligible?: unknown;
    mayCreateUser?: unknown;
  } | null;
  if (
    typeof body?.eligible !== "boolean" ||
    typeof body.mayCreateUser !== "boolean"
  ) {
    throw new Error(
      "Business sign-in eligibility returned an invalid response.",
    );
  }
  return {
    eligible: body.eligible,
    mayCreateUser: body.mayCreateUser,
  };
}
