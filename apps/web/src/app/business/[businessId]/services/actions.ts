"use server";

import { saveBusinessServiceSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessServicesApiError,
  saveBusinessService,
} from "@/lib/business-services";

export type ServiceActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

function optionalNumber(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? Number(value) : undefined;
}

export async function saveService(
  businessId: string,
  serviceId: string | null,
  _state: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const parsed = saveBusinessServiceSchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description"),
    priceFrom: optionalNumber(formData, "priceFrom"),
    priceTo: optionalNumber(formData, "priceTo"),
    isAvailable: formData.get("isAvailable") === "on",
    status: formData.get("status") || "active",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the service details.",
    };
  }

  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");
  try {
    const result = await saveBusinessService(
      session.accessToken,
      businessId,
      serviceId,
      parsed.data,
    );
    revalidatePath(`/business/${businessId}/services`);
    revalidatePath(`/business/${businessId}/coverage`);
    revalidatePath(`/businesses/${result.business.slug}`);
    revalidatePath("/businesses");
    revalidatePath("/business/dashboard");
    return {
      status: "success",
      message: serviceId ? "Service updated." : "Service added.",
    };
  } catch (error) {
    if (error instanceof BusinessServicesApiError && error.status === 401) {
      redirect("/business/sign-in?error=session_expired");
    }
    return {
      status: "error",
      message:
        error instanceof BusinessServicesApiError
          ? error.message
          : "The service could not be saved.",
    };
  }
}
