"use server";
import {
  adminLocationStatusActionSchema,
  saveAdminDistrictSchema,
  saveAdminProvinceSchema,
} from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminLocationsApiError,
  changeLocationStatus,
  saveDistrict,
  saveProvince,
} from "@/lib/admin-locations";
import { getVerifiedSession } from "@/lib/authenticated-session";

async function token() {
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/locations");
  return session.accessToken;
}
function done(result: string): never {
  revalidatePath("/admin/locations");
  revalidatePath("/request");
  revalidatePath("/for-business");
  redirect(`/admin/locations?result=${result}`);
}
function failed(error: unknown): never {
  if (error instanceof AdminLocationsApiError) {
    if (error.status === 401)
      redirect("/admin/sign-in?next=/admin/locations&error=session_expired");
    if (error.status === 403) redirect("/admin/locations?result=forbidden");
    if (error.status === 404) redirect("/admin/locations?result=not-found");
    if (error.status === 409) redirect("/admin/locations?result=conflict");
  }
  redirect("/admin/locations?result=unavailable");
}
export async function submitProvince(id: string | null, form: FormData) {
  const parsed = saveAdminProvinceSchema.safeParse({
    name: form.get("name"),
    slug: form.get("slug"),
  });
  if (!parsed.success) redirect("/admin/locations?result=invalid");
  try {
    await saveProvince(await token(), parsed.data, id ?? undefined);
  } catch (error) {
    failed(error);
  }
  done(id ? "province-updated" : "province-created");
}
export async function submitDistrict(id: string | null, form: FormData) {
  const parsed = saveAdminDistrictSchema.safeParse({
    provinceId: form.get("provinceId"),
    name: form.get("name"),
    slug: form.get("slug"),
  });
  if (!parsed.success) redirect("/admin/locations?result=invalid");
  try {
    await saveDistrict(await token(), parsed.data, id ?? undefined);
  } catch (error) {
    failed(error);
  }
  done(id ? "district-updated" : "district-created");
}
export async function submitLocationStatus(
  entity: "provinces" | "districts",
  id: string,
  form: FormData,
) {
  const parsed = adminLocationStatusActionSchema.safeParse({
    action: form.get("action"),
    reason: form.get("reason"),
  });
  if (!parsed.success) redirect("/admin/locations?result=invalid-status");
  try {
    await changeLocationStatus(await token(), entity, id, parsed.data);
  } catch (error) {
    failed(error);
  }
  done(parsed.data.action);
}
