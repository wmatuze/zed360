"use server";

import { z } from "zod";
import { resolveAdminEmail } from "@/lib/admin-identity";
import { createClient } from "@/lib/supabase/server";

const usernameSchema = z.string().trim().min(3).max(50);
const neutralMessage =
  "If this username has administrator access, password setup instructions have been sent.";

export type AdminPasswordRequestState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function requestAdminPasswordReset(
  _previousState: AdminPasswordRequestState,
  formData: FormData,
): Promise<AdminPasswordRequestState> {
  const username = usernameSchema.safeParse(formData.get("username"));
  if (!username.success) {
    return { status: "error", message: "Enter a valid username." };
  }

  try {
    const email = await resolveAdminEmail(username.data);
    if (!email) return { status: "success", message: neutralMessage };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const confirmationUrl = new URL("/auth/confirm", appUrl);
    confirmationUrl.searchParams.set("next", "/admin/update-password");

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: confirmationUrl.toString(),
    });
    if (error) {
      if (
        error.status === 429 ||
        /rate limit|security purposes/i.test(error.message)
      ) {
        return {
          status: "error",
          message: "Wait about one minute before requesting another email.",
        };
      }
      return process.env.NODE_ENV === "development"
        ? {
            status: "error",
            message: "The password setup email could not be sent.",
          }
        : { status: "success", message: neutralMessage };
    }
    return { status: "success", message: neutralMessage };
  } catch {
    return {
      status: "error",
      message: "Password setup is temporarily unavailable.",
    };
  }
}
