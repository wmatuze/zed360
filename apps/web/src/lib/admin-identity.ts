const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export async function resolveAdminEmail(username: string) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret || internalSecret.length < 32) {
    throw new Error("Administrator authentication is not configured.");
  }

  const response = await fetch(`${apiUrl}/admin/users/sign-in-identity`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-zed360-internal-secret": internalSecret,
    },
    body: JSON.stringify({ username }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Administrator identity could not be checked.");
  }

  const body = (await response.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  return typeof body?.email === "string" ? body.email : null;
}
