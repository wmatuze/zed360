"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
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

  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret || internalSecret.length < 32) {
    return {
      status: "error",
      message: "Administrator sign-in is not configured.",
    };
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
    const identityResponse = await fetch(
      `${apiUrl}/admin/users/sign-in-identity`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-zed360-internal-secret": internalSecret,
        },
        body: JSON.stringify({ username: username.data }),
        cache: "no-store",
      },
    );
    const identity = (await identityResponse.json().catch(() => null)) as {
      email?: unknown;
    } | null;
    if (!identityResponse.ok || typeof identity?.email !== "string") {
      return { status: "error", message: invalidCredentialsMessage };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identity.email,
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
