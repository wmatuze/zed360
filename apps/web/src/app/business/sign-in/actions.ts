"use server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(254);

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
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        emailRedirectTo: confirmationUrl.toString(),
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("[business-sign-in] Supabase rejected the OTP request", {
        code: error.code,
        status: error.status,
      });
      return {
        status: "error",
        message:
          "We could not send the sign-in email. Please wait a moment and try again.",
      };
    }

    return {
      status: "success",
      message:
        "Check your email and use the Zed360 sign-in link. You can close this page after opening it.",
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
