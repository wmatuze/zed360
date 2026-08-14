"use server";

import { updateBusinessPresenceSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  confirmBusinessProfile,
  updateBusinessPresence,
} from "@/lib/business-presence";

function refresh(businessId: string, slug?: string) {
  revalidatePath(`/business/${businessId}/presence`);
  revalidatePath("/business/dashboard");
  revalidatePath("/businesses");
  if (slug) revalidatePath(`/businesses/${slug}`);
}

export async function saveAvailability(
  businessId: string,
  slug: string,
  formData: FormData,
) {
  const parsed = updateBusinessPresenceSchema.safeParse({
    availability: formData.get("availability"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success)
    redirect(`/business/${businessId}/presence?result=invalid`);
  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/presence`);
  try {
    await updateBusinessPresence(session.accessToken, businessId, parsed.data);
  } catch {
    redirect(`/business/${businessId}/presence?result=error`);
  }
  refresh(businessId, slug);
  redirect(`/business/${businessId}/presence?result=availability-saved`);
}

export async function confirmProfile(businessId: string, slug: string) {
  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/presence`);
  try {
    await confirmBusinessProfile(session.accessToken, businessId);
  } catch {
    redirect(`/business/${businessId}/presence?result=error`);
  }
  refresh(businessId, slug);
  redirect(`/business/${businessId}/presence?result=profile-confirmed`);
}
