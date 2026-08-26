"use server";

import { saveBusinessLocationSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessLocationsApiError,
  createBusinessLocation,
  makeBusinessLocationPrimary,
  setBusinessLocationStatus,
  updateBusinessLocation,
} from "@/lib/business-locations";

export type LocationActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

async function session() {
  const value = await getVerifiedBusinessSession();
  if (!value) redirect("/business/sign-in");
  return value;
}

const input = (formData: FormData) =>
  saveBusinessLocationSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    districtId: formData.get("districtId"),
  });

function failure(error: unknown): LocationActionState {
  return {
    status: "error",
    message:
      error instanceof BusinessLocationsApiError
        ? error.message
        : "The location could not be updated.",
  };
}

async function refreshed(businessId: string, slug: string) {
  revalidatePath(`/business/${businessId}/locations`);
  revalidatePath(`/business/${businessId}/hours`);
  revalidatePath(`/businesses/${slug}`);
  revalidatePath("/businesses");
}

export async function createLocation(
  businessId: string,
  _state: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const parsed = input(formData);
  if (!parsed.success)
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Check the location information.",
    };
  const authentication = await session();
  try {
    const result = await createBusinessLocation(
      authentication.accessToken,
      businessId,
      parsed.data,
    );
    await refreshed(businessId, result.business.slug);
    return { status: "success", message: "Location added." };
  } catch (error) {
    return failure(error);
  }
}

export async function updateLocation(
  businessId: string,
  locationId: string,
  _state: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const parsed = input(formData);
  if (!parsed.success)
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Check the location information.",
    };
  const authentication = await session();
  try {
    const result = await updateBusinessLocation(
      authentication.accessToken,
      businessId,
      locationId,
      parsed.data,
    );
    await refreshed(businessId, result.business.slug);
    return { status: "success", message: "Location updated." };
  } catch (error) {
    return failure(error);
  }
}

export async function setPrimary(
  businessId: string,
  locationId: string,
  _state: LocationActionState,
  _formData: FormData,
): Promise<LocationActionState> {
  void _state;
  void _formData;
  const authentication = await session();
  try {
    const result = await makeBusinessLocationPrimary(
      authentication.accessToken,
      businessId,
      locationId,
    );
    await refreshed(businessId, result.business.slug);
    return { status: "success", message: "Primary location changed." };
  } catch (error) {
    return failure(error);
  }
}

export async function changeStatus(
  businessId: string,
  locationId: string,
  isActive: boolean,
  _state: LocationActionState,
  _formData: FormData,
): Promise<LocationActionState> {
  void _state;
  void _formData;
  const authentication = await session();
  try {
    const result = await setBusinessLocationStatus(
      authentication.accessToken,
      businessId,
      locationId,
      isActive,
    );
    await refreshed(businessId, result.business.slug);
    return {
      status: "success",
      message: isActive ? "Location reactivated." : "Location deactivated.",
    };
  } catch (error) {
    return failure(error);
  }
}
