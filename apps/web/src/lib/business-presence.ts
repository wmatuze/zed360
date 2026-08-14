import {
  businessPresenceSchema,
  type BusinessPresence,
  type UpdateBusinessPresence,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

async function parse(response: Response): Promise<BusinessPresence> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : "Business availability is unavailable.",
    );
  }
  return businessPresenceSchema.parse(body);
}

export const fetchBusinessPresence = (token: string, businessId: string) =>
  fetch(`${apiUrl}/business-account/${businessId}/presence`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` },
  }).then(parse);

export const updateBusinessPresence = (
  token: string,
  businessId: string,
  update: UpdateBusinessPresence,
) =>
  fetch(`${apiUrl}/business-account/${businessId}/presence/availability`, {
    method: "PUT",
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(update),
  }).then(parse);

export const confirmBusinessProfile = (token: string, businessId: string) =>
  fetch(
    `${apiUrl}/business-account/${businessId}/presence/profile-confirmation`,
    {
      method: "POST",
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    },
  ).then(parse);
