import {
  businessLocationManagementSchema,
  type BusinessLocationManagement,
  type SaveBusinessLocation,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessLocationsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parse(response: Response): Promise<BusinessLocationManagement> {
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new BusinessLocationsApiError(
      typeof body?.message === "string"
        ? body.message
        : "Business locations are unavailable.",
      response.status,
    );
  return businessLocationManagementSchema.parse(body);
}

const request = (token: string, path: string, method = "GET", body?: unknown) =>
  fetch(`${apiUrl}${path}`, {
    method,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(parse);

export const fetchBusinessLocations = (token: string, businessId: string) =>
  request(token, `/business-account/${businessId}/locations`);
export const createBusinessLocation = (
  token: string,
  businessId: string,
  input: SaveBusinessLocation,
) => request(token, `/business-account/${businessId}/locations`, "POST", input);
export const updateBusinessLocation = (
  token: string,
  businessId: string,
  locationId: string,
  input: SaveBusinessLocation,
) =>
  request(
    token,
    `/business-account/${businessId}/locations/${locationId}`,
    "PUT",
    input,
  );
export const makeBusinessLocationPrimary = (
  token: string,
  businessId: string,
  locationId: string,
) =>
  request(
    token,
    `/business-account/${businessId}/locations/${locationId}/primary`,
    "POST",
  );
export const setBusinessLocationStatus = (
  token: string,
  businessId: string,
  locationId: string,
  isActive: boolean,
) =>
  request(
    token,
    `/business-account/${businessId}/locations/${locationId}/status`,
    "PUT",
    { isActive },
  );
