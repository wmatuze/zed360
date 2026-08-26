"use server";
import { saveBusinessProfileSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import { submitBusinessProfile } from "@/lib/business-profile-management";

export async function saveProfile(businessId: string, formData: FormData) {
  const parsed = saveBusinessProfileSchema.safeParse(
    Object.fromEntries(
      ["description", "phone", "whatsapp", "email", "website"].map((key) => [
        key,
        String(formData.get(key) ?? ""),
      ]),
    ),
  );
  if (!parsed.success)
    redirect(`/business/${businessId}/profile?result=invalid`);
  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/profile`);
  try {
    await submitBusinessProfile(session.accessToken, businessId, parsed.data);
  } catch {
    redirect(`/business/${businessId}/profile?result=error`);
  }
  revalidatePath(`/business/${businessId}/profile`);
  redirect(`/business/${businessId}/profile?result=saved`);
}
