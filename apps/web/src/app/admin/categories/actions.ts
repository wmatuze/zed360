"use server";

import {
  adminCategoryStatusActionSchema,
  saveAdminCategorySchema,
} from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminCategoriesApiError,
  saveAdminCategory,
  submitAdminCategoryStatus,
} from "@/lib/admin-categories";
import { getVerifiedSession } from "@/lib/authenticated-session";

export async function saveCategory(
  categoryId: string | null,
  formData: FormData,
) {
  const parsed = saveAdminCategorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    parentId: formData.get("parentId"),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) redirect("/admin/categories?result=invalid");

  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/categories");
  try {
    await saveAdminCategory(
      session.accessToken,
      parsed.data,
      categoryId ?? undefined,
    );
  } catch (error) {
    redirectForError(error);
  }
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/request");
  revalidatePath("/businesses");
  redirect(`/admin/categories?result=${categoryId ? "updated" : "created"}`);
}

export async function changeCategoryStatus(
  categoryId: string,
  formData: FormData,
) {
  const parsed = adminCategoryStatusActionSchema.safeParse({
    action: formData.get("action"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/admin/categories?result=invalid-status");

  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/categories");
  try {
    await submitAdminCategoryStatus(
      session.accessToken,
      categoryId,
      parsed.data,
    );
  } catch (error) {
    redirectForError(error);
  }
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/request");
  revalidatePath("/businesses");
  redirect(`/admin/categories?result=${parsed.data.action}`);
}

function redirectForError(error: unknown): never {
  if (error instanceof AdminCategoriesApiError) {
    if (error.status === 401) {
      redirect("/admin/sign-in?next=/admin/categories&error=session_expired");
    }
    if (error.status === 403) redirect("/admin/categories?result=forbidden");
    if (error.status === 404) redirect("/admin/categories?result=not-found");
    if (error.status === 409) redirect("/admin/categories?result=conflict");
  }
  redirect("/admin/categories?result=unavailable");
}
