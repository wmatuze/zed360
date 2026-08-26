"use server";

import {
  updateLocationOperatingHoursSchema,
  type OperatingHoursDay,
} from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessOperatingHoursApiError,
  saveLocationOperatingHours,
} from "@/lib/business-operating-hours";

export type OperatingHoursFormState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function saveHours(
  businessId: string,
  locationId: string,
  _previous: OperatingHoursFormState,
  formData: FormData,
): Promise<OperatingHoursFormState> {
  const days: OperatingHoursDay[] = Array.from(
    { length: 7 },
    (_, dayOfWeek) => {
      const status = String(
        formData.get(`day-${dayOfWeek}-status`) ?? "closed",
      );
      if (status === "hours") {
        return {
          dayOfWeek,
          status,
          opensAt: String(formData.get(`day-${dayOfWeek}-opens`) ?? ""),
          closesAt: String(formData.get(`day-${dayOfWeek}-closes`) ?? ""),
        };
      }
      return {
        dayOfWeek,
        status: status === "open_24_hours" ? status : "closed",
      };
    },
  );
  const parsed = updateLocationOperatingHoursSchema.safeParse({ days });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the operating hours.",
    };
  }

  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");
  try {
    const result = await saveLocationOperatingHours(
      session.accessToken,
      businessId,
      locationId,
      parsed.data,
    );
    revalidatePath(`/business/${businessId}/hours`);
    revalidatePath(`/businesses/${result.business.slug}`);
  } catch (error) {
    if (
      error instanceof BusinessOperatingHoursApiError &&
      error.status === 401
    ) {
      redirect("/business/sign-in?error=session_expired");
    }
    return {
      status: "error",
      message:
        error instanceof BusinessOperatingHoursApiError
          ? error.message
          : "Operating hours could not be saved.",
    };
  }
  return { status: "success", message: "Operating hours published." };
}
