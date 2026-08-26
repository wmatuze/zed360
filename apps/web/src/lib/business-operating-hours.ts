import {
  businessOperatingHoursSchema,
  type BusinessOperatingHours,
  type UpdateLocationOperatingHours,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessOperatingHoursApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parse(response: Response): Promise<BusinessOperatingHours> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new BusinessOperatingHoursApiError(
      typeof body?.message === "string"
        ? body.message
        : "Operating hours are unavailable.",
      response.status,
    );
  }
  return businessOperatingHoursSchema.parse(body);
}

export const fetchBusinessOperatingHours = (
  token: string,
  businessId: string,
) =>
  fetch(`${apiUrl}/business-account/${businessId}/operating-hours`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` },
  }).then(parse);

export const saveLocationOperatingHours = (
  token: string,
  businessId: string,
  locationId: string,
  update: UpdateLocationOperatingHours,
) =>
  fetch(
    `${apiUrl}/business-account/${businessId}/operating-hours/locations/${locationId}`,
    {
      method: "PUT",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(update),
    },
  ).then(parse);
