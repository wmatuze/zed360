"use server";

import {
  completeBusinessMediaUploadSchema,
  createBusinessMediaUploadIntentSchema,
  saveBusinessProductSchema,
  type CompleteBusinessMediaUpload,
  type CreateBusinessMediaUploadIntent,
} from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessCatalogApiError,
  registerBusinessMedia,
  deleteBusinessMedia,
  requestBusinessMediaUpload,
  saveBusinessProduct,
} from "@/lib/business-catalog";
import { createClient } from "@/lib/supabase/server";

export type CatalogActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function optionalNumber(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? Number(value) : undefined;
}

function productPrices(formData: FormData) {
  const pricingType = String(formData.get("pricingType") ?? "");
  if (pricingType === "contact") return {};
  if (pricingType === "fixed" || pricingType === "from") {
    const price = optionalNumber(formData, "price");
    if (price === undefined) {
      return { error: "Enter the product price." } as const;
    }
    return pricingType === "fixed"
      ? { priceFrom: price, priceTo: price }
      : { priceFrom: price };
  }
  if (pricingType === "range") {
    const priceFrom = optionalNumber(formData, "priceFrom");
    const priceTo = optionalNumber(formData, "priceTo");
    if (priceFrom === undefined || priceTo === undefined) {
      return { error: "Enter both the minimum and maximum price." } as const;
    }
    return { priceFrom, priceTo };
  }
  return { error: "Choose a valid pricing option." } as const;
}

export async function saveProduct(
  businessId: string,
  productId: string | null,
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const prices = productPrices(formData);
  if ("error" in prices && prices.error) {
    return { status: "error", message: prices.error };
  }
  const parsed = saveBusinessProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    ...prices,
    availability: formData.get("availability"),
    status: formData.get("status") || "active",
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the product details.",
    };
  }

  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");
  try {
    await saveBusinessProduct(
      session.accessToken,
      businessId,
      productId,
      parsed.data,
    );
  } catch (error) {
    return catalogError(error, "The product could not be saved.");
  }
  revalidateCatalog(businessId);
  return {
    status: "success",
    message: productId ? "Product updated." : "Product added.",
  };
}

export type PreparedMediaUpload =
  | {
      status: "success";
      message: string;
      bucket: string;
      path: string;
      token: string;
    }
  | { status: "error"; message: string };

export async function prepareMediaUpload(
  businessId: string,
  input: CreateBusinessMediaUploadIntent,
): Promise<PreparedMediaUpload> {
  const parsed = createBusinessMediaUploadIntentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the selected image.",
    };
  }
  const session = await getVerifiedBusinessSession();
  if (!session) return { status: "error", message: "Sign in again to upload." };

  try {
    const intent = await requestBusinessMediaUpload(
      session.accessToken,
      businessId,
      parsed.data,
    );
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(intent.bucket)
      .createSignedUploadUrl(intent.path);
    if (error || !data?.token) {
      return {
        status: "error",
        message:
          "Image storage is not ready. Complete the Zed360 media bucket and upload-policy setup, then try again.",
      };
    }
    return {
      status: "success",
      message: "Upload authorized.",
      bucket: intent.bucket,
      path: intent.path,
      token: data.token,
    };
  } catch (error) {
    const result = catalogError(
      error,
      "The image upload could not be prepared.",
    );
    return { status: "error", message: result.message };
  }
}

export async function completeMediaUpload(
  businessId: string,
  input: CompleteBusinessMediaUpload,
): Promise<CatalogActionState> {
  const parsed = completeBusinessMediaUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Check the image information.",
    };
  }
  const session = await getVerifiedBusinessSession();
  if (!session) return { status: "error", message: "Sign in again to upload." };
  try {
    await registerBusinessMedia(session.accessToken, businessId, parsed.data);
  } catch (error) {
    return catalogError(error, "The uploaded image could not be registered.");
  }
  revalidateCatalog(businessId);
  return {
    status: "success",
    message:
      parsed.data.purpose === "logo" || parsed.data.purpose === "cover"
        ? "Identity image uploaded for Zed360 review."
        : "Image uploaded and published.",
  };
}

export async function removeMedia(
  businessId: string,
  mediaId: string,
): Promise<CatalogActionState> {
  const session = await getVerifiedBusinessSession();
  if (!session)
    return { status: "error", message: "Sign in again to remove this image." };
  try {
    await deleteBusinessMedia(session.accessToken, businessId, mediaId);
  } catch (error) {
    return catalogError(error, "The image could not be removed.");
  }
  revalidateCatalog(businessId);
  return { status: "success", message: "Image removed." };
}

function catalogError(error: unknown, fallback: string): CatalogActionState {
  if (error instanceof BusinessCatalogApiError && error.status === 401) {
    return { status: "error", message: "Your session expired. Sign in again." };
  }
  return {
    status: "error",
    message:
      error instanceof BusinessCatalogApiError ? error.message : fallback,
  };
}

function revalidateCatalog(businessId: string) {
  revalidatePath(`/business/${businessId}/catalog`);
  revalidatePath("/businesses");
  revalidatePath("/businesses/[slug]", "page");
}
