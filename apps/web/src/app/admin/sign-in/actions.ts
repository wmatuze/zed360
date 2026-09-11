"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { resolveAdminEmail } from "@/lib/admin-identity";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

const usernameSchema = z.string().trim().min(3).max(50);
const passwordSchema = z.string().min(8).max(128);
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const invalidCredentialsMessage = "The username or password is incorrect.";

export type AdminSignInState = {
  status: "idle" | "error";
  message: string;
};

export async function signInAdmin(
  _previousState: AdminSignInState,
  formData: FormData,
): Promise<AdminSignInState> {
  const username = usernameSchema.safeParse(formData.get("username"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!username.success || !password.success) {
    return { status: "error", message: invalidCredentialsMessage };
  }

  const requestedNext = safeNextPath(
    typeof formData.get("next") === "string"
      ? (formData.get("next") as string)
      : null,
    "/admin",
  );
  const next =
    requestedNext === "/admin" || requestedNext.startsWith("/admin/")
      ? requestedNext
      : "/admin";

  try {
    const email = await resolveAdminEmail(username.data);
    if (!email) {
      return { status: "error", message: invalidCredentialsMessage };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password.data,
    });
    if (error || !data.session) {
      return { status: "error", message: invalidCredentialsMessage };
    }

    const accessResponse = await fetch(`${apiUrl}/admin/access`, {
      headers: { authorization: `Bearer ${data.session.access_token}` },
      cache: "no-store",
    });
    if (!accessResponse.ok) {
      await supabase.auth.signOut();
      return { status: "error", message: invalidCredentialsMessage };
    }
  } catch {
    return {
      status: "error",
      message: "Administrator sign-in is temporarily unavailable.",
    };
  }

  redirect(next);
}
