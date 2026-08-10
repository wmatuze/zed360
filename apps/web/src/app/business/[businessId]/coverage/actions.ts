"use server";

import {
  updateBusinessServiceCoverageSchema,
  type UpdateBusinessServiceCoverage,
} from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessServiceCoverageApiError,
  saveBusinessServiceCoverage,
} from "@/lib/business-service-coverage";

export type CoverageFormState = {
  status: "idle" | "error" | "success";
  message: string;
};

const geographicModes = ["business_travel", "delivery"] as const;

function optionalNumber(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? Number(value) : undefined;
}

export async function saveCoverage(
  businessId: string,
  serviceId: string,
  _previousState: CoverageFormState,
  formData: FormData,
): Promise<CoverageFormState> {
  const options: UpdateBusinessServiceCoverage["options"] = [];
  if (formData.get("at_business")) {
    options.push({
      mode: "at_business",
      coverageScope: "business_location",
      districtIds: [],
      provinceIds: [],
    });
  }
  if (formData.get("customer_pickup")) {
    options.push({
      mode: "customer_pickup",
      coverageScope: "business_location",
      districtIds: [],
      provinceIds: [],
    });
  }
  if (formData.get("remote")) {
    options.push({
      mode: "remote",
      coverageScope: "remote",
      districtIds: [],
      provinceIds: [],
    });
  }
  for (const mode of geographicModes) {
    if (!formData.get(mode)) continue;
    options.push({
      mode,
      coverageScope: String(formData.get(`${mode}_scope`)),
      districtIds: formData.getAll(`${mode}_districts`).map(String),
      provinceIds: formData.getAll(`${mode}_provinces`).map(String),
      feeMinimum: optionalNumber(formData, `${mode}_fee_minimum`),
      feeMaximum: optionalNumber(formData, `${mode}_fee_maximum`),
      leadTimeMinimumDays: optionalNumber(
        formData,
        `${mode}_lead_minimum`,
      ),
      leadTimeMaximumDays: optionalNumber(
        formData,
        `${mode}_lead_maximum`,
      ),
      notes: String(formData.get(`${mode}_notes`) ?? ""),
    } as UpdateBusinessServiceCoverage["options"][number]);
  }

  const parsed = updateBusinessServiceCoverageSchema.safeParse({ options });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the selected coverage.",
    };
  }

  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");
  try {
    await saveBusinessServiceCoverage(
      session.accessToken,
      businessId,
      serviceId,
      parsed.data,
    );
  } catch (error) {
    if (error instanceof BusinessServiceCoverageApiError && error.status === 401) {
      redirect("/business/sign-in?error=session_expired");
    }
    return {
      status: "error",
      message:
        error instanceof BusinessServiceCoverageApiError
          ? error.message
          : "Service coverage could not be saved.",
    };
  }

  revalidatePath(`/business/${businessId}/coverage`);
  return {
    status: "success",
    message: "Service coverage saved and confirmed.",
  };
}
