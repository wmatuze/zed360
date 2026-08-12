import { businessProfileManagementSchema, type BusinessProfileManagement, type SaveBusinessProfile } from "@zed360/contracts";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
async function parse(response: Response): Promise<BusinessProfileManagement> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.message === "string" ? body.message : "Business profile is unavailable.");
  return businessProfileManagementSchema.parse(body);
}
export const fetchBusinessProfile = (token: string, businessId: string) =>
  fetch(`${apiUrl}/business-account/${businessId}/profile`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } }).then(parse);
export const submitBusinessProfile = (token: string, businessId: string, profile: SaveBusinessProfile) =>
  fetch(`${apiUrl}/business-account/${businessId}/profile`, { method: "PUT", cache: "no-store", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(profile) }).then(parse);
