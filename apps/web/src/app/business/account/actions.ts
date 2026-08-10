"use server";

import { claimBusinessSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BusinessAccountApiError,
  getVerifiedBusinessSession,
  linkBusiness,
} from "@/lib/business-account";
import { createClient } from "@/lib/supabase/server";

export async function claimBusiness(businessId: string) {
  const parsed = claimBusinessSchema.safeParse({ businessId });
  if (!parsed.success) redirect("/business/account?link=invalid");

  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");

  try {
    await linkBusiness(session.accessToken, parsed.data.businessId);
  } catch (error) {
    if (error instanceof BusinessAccountApiError) {
      if (error.status === 401)
        redirect("/business/sign-in?error=session_expired");
      if (error.status === 409) redirect("/business/account?link=claimed");
      if (error.status === 404) redirect("/business/account?link=not-eligible");
    }
    redirect("/business/account?link=unavailable");
  }

  revalidatePath("/business/account");
  redirect("/business/account?link=success");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/business/sign-in");
}
