"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fetchAdminAccess } from "@/lib/admin-access";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { createClient } from "@/lib/supabase/server";

const passwordSchema = z.string().min(8).max(128);

export type AdminPasswordUpdateState = {
  status: "idle" | "error";
  message: string;
};

export async function updateAdminPassword(
  _previousState: AdminPasswordUpdateState,
  formData: FormData,
): Promise<AdminPasswordUpdateState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  const confirmation = formData.get("passwordConfirmation");
  if (!password.success) {
    return {
      status: "error",
      message: "Use a password between 8 and 128 characters.",
    };
  }
  if (password.data !== confirmation) {
    return { status: "error", message: "The passwords do not match." };
  }

  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?error=session_expired");
  try {
    await fetchAdminAccess(session.accessToken);
  } catch {
    redirect("/admin/sign-in?error=session_expired");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: password.data,
  });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "weak_password"
          ? "Choose a stronger password that is harder to guess."
          : "The password could not be updated. Request a new setup email and try again.",
    };
  }

  await supabase.auth.signOut();
  redirect("/admin/sign-in?password=updated");
}
