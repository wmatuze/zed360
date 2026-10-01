import {
  adminLocationListSchema,
  type AdminLocationList,
  type AdminLocationStatusAction,
  type SaveAdminDistrict,
  type SaveAdminProvince,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
export class AdminLocationsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function parse(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok)
    throw new AdminLocationsApiError(
      typeof body?.message === "string"
        ? body.message
        : "Location administration is unavailable.",
      response.status,
    );
  return body;
}
export async function fetchAdminLocations(
  token: string,
  query: { q?: string; status?: string; provinceId?: string },
): Promise<AdminLocationList> {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.status) search.set("status", query.status);
  if (query.provinceId) search.set("provinceId", query.provinceId);
  const response = await fetch(`${apiUrl}/admin/locations?${search}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return adminLocationListSchema.parse(await parse(response));
}
export async function saveProvince(
  token: string,
  input: SaveAdminProvince,
  id?: string,
) {
  return mutate(
    token,
    id
      ? `${apiUrl}/admin/locations/provinces/${id}`
      : `${apiUrl}/admin/locations/provinces`,
    id ? "PUT" : "POST",
    input,
  );
}
export async function saveDistrict(
  token: string,
  input: SaveAdminDistrict,
  id?: string,
) {
  return mutate(
    token,
    id
      ? `${apiUrl}/admin/locations/districts/${id}`
      : `${apiUrl}/admin/locations/districts`,
    id ? "PUT" : "POST",
    input,
  );
}
export async function changeLocationStatus(
  token: string,
  entity: "provinces" | "districts",
  id: string,
  input: AdminLocationStatusAction,
) {
  return mutate(
    token,
    `${apiUrl}/admin/locations/${entity}/${id}/actions`,
    "POST",
    input,
  );
}
async function mutate(
  token: string,
  url: string,
  method: string,
  input: unknown,
) {
  return parse(
    await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    }),
  );
}
