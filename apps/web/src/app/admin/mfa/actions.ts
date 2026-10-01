"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fetchAdminAccess } from "@/lib/admin-access";
import { recordMfaAttempt } from "@/lib/admin-identity";
import { getVerifiedSession } from "@/lib/authenticated-session";
import {
  TooManySignInAttemptsError,
  tooManyAttemptsMessage,
} from "@/lib/client-ip";
import { adminNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

const codeSchema = z.string().trim().regex(/^\d{6}$/);
const factorSchema = z.string().uuid();

export type MfaEnrollmentState =
  | { status: "idle" | "error"; message: string }
  | { status: "ready"; factorId: string; qrCode: string; secret: string };

export type MfaVerifyState = { status: "idle" | "error"; message: string };

async function requireReviewerSession() {
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?error=session_expired");
  try {
    await fetchAdminAccess(session.accessToken);
  } catch {
    redirect("/admin/sign-in?error=session_expired");
  }
}

export async function startMfaEnrollment(): Promise<MfaEnrollmentState> {
  await requireReviewerSession();
  const supabase = await createClient();

  const { data: factors, error: listError } =
    await supabase.auth.mfa.listFactors();
  if (listError) {
    return {
      status: "error",
      message: "Authenticator setup is unavailable. Please try again.",
    };
  }
  if (factors.totp.length > 0) {
    return {
      status: "error",
      message: "An authenticator is already set up. Enter its code instead.",
    };
  }

  // Remove setups that were started but never confirmed, so a fresh QR code
  // can be issued under the same name.
  for (const factor of factors.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Zed360 administration",
    issuer: "Zed360",
  });
  if (error || !data) {
    return {
      status: "error",
      message: "Authenticator setup could not start. Please try again.",
    };
  }

  return {
    status: "ready",
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifyMfaCode(
  _previous: MfaVerifyState,
  formData: FormData,
): Promise<MfaVerifyState> {
  const code = codeSchema.safeParse(formData.get("code"));
  const factorId = factorSchema.safeParse(formData.get("factorId"));
  const next = adminNextPath(
    typeof formData.get("next") === "string"
      ? (formData.get("next") as string)
      : null,
  );
  if (!code.success || !factorId.success) {
    return {
      status: "error",
      message: "Enter the six-digit code from your authenticator app.",
    };
  }

  await requireReviewerSession();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (typeof userId !== "string") {
    redirect("/admin/sign-in?error=session_expired");
  }

  try {
    await recordMfaAttempt(userId);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof TooManySignInAttemptsError
          ? tooManyAttemptsMessage
          : "Authenticator verification is temporarily unavailable.",
    };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factorId.data,
    code: code.data,
  });
  if (error) {
    return {
      status: "error",
      message:
        "That code did not match. Check your authenticator app and try again.",
    };
  }

  redirect(next);
}
