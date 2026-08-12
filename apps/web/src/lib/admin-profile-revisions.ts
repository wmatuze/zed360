import { adminBusinessProfileRevisionQueueSchema, type AdminBusinessProfileRevisionQueue, type BusinessProfileDecision } from "@zed360/contracts";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
export async function fetchProfileRevisions(token: string): Promise<AdminBusinessProfileRevisionQueue> {
  const response = await fetch(`${apiUrl}/admin/profile-revisions`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error("Profile reviews are unavailable.");
  return adminBusinessProfileRevisionQueueSchema.parse(body);
}
export async function decideProfileRevision(token: string, revisionId: string, decision: BusinessProfileDecision) {
  const response = await fetch(`${apiUrl}/admin/profile-revisions/${revisionId}/decisions`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(decision) });
  if (!response.ok) throw new Error("The profile decision could not be saved.");
}
