import "server-only";

import {
  businessServiceCoverageSchema,
  referenceDataSchema,
  type BusinessServiceCoverage,
  type ReferenceData,
  type UpdateBusinessServiceCoverage,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessServiceCoverageApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parsedResponse<T>(
  response: Response,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  fallbackMessage: string,
) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new BusinessServiceCoverageApiError(
      typeof body?.message === "string" ? body.message : fallbackMessage,
      response.status,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !parsed.data) {
    throw new BusinessServiceCoverageApiError(
      "The service coverage API returned an invalid response.",
      502,
    );
  }
  return parsed.data;
}

export async function fetchBusinessServiceCoverage(
  accessToken: string,
  businessId: string,
): Promise<BusinessServiceCoverage> {
  const response = await fetch(
    `${apiUrl}/business-account/${businessId}/service-coverage`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  return parsedResponse(
    response,
    businessServiceCoverageSchema,
    "Service coverage is unavailable.",
  );
}

export async function saveBusinessServiceCoverage(
  accessToken: string,
  businessId: string,
  serviceId: string,
  coverage: UpdateBusinessServiceCoverage,
): Promise<BusinessServiceCoverage> {
  const response = await fetch(
    `${apiUrl}/business-account/${businessId}/service-coverage/services/${serviceId}`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(coverage),
      cache: "no-store",
    },
  );
  return parsedResponse(
    response,
    businessServiceCoverageSchema,
    "Service coverage could not be saved.",
  );
}

export async function fetchCoverageReferenceData(): Promise<ReferenceData> {
  const response = await fetch(`${apiUrl}/reference-data`, {
    cache: "no-store",
  });
  return parsedResponse(
    response,
    referenceDataSchema,
    "Locations are unavailable.",
  );
}
