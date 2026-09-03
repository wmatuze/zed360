import "server-only";

import {
  businessServiceManagementSchema,
  type BusinessServiceManagement,
  type SaveBusinessService,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessServicesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parse(response: Response): Promise<BusinessServiceManagement> {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new BusinessServicesApiError(
      typeof body?.message === "string"
        ? body.message
        : "Business services are unavailable.",
      response.status,
    );
  }
  const result = businessServiceManagementSchema.safeParse(body);
  if (!result.success) {
    throw new BusinessServicesApiError(
      "The services API returned incomplete information.",
      502,
    );
  }
  return result.data;
}

function endpoint(businessId: string, serviceId?: string) {
  return `${apiUrl}/business-account/${businessId}/services${serviceId ? `/${serviceId}` : ""}`;
}

export async function fetchBusinessServices(
  accessToken: string,
  businessId: string,
) {
  return parse(
    await fetch(endpoint(businessId), {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
  );
}

export async function saveBusinessService(
  accessToken: string,
  businessId: string,
  serviceId: string | null,
  service: SaveBusinessService,
) {
  return parse(
    await fetch(endpoint(businessId, serviceId ?? undefined), {
      method: serviceId ? "PUT" : "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(service),
      cache: "no-store",
    }),
  );
}
