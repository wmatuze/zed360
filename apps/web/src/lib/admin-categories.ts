import {
  adminCategoryListSchema,
  type AdminCategoryList,
  type AdminCategoryStatusAction,
  type SaveAdminCategory,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminCategoriesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function responseBody(response: Response) {
  return (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
}

export async function fetchAdminCategories(
  token: string,
  query: { q?: string; status?: "all" | "active" | "inactive" },
): Promise<AdminCategoryList> {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.status) search.set("status", query.status);
  const response = await fetch(`${apiUrl}/admin/categories?${search}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await responseBody(response);
  if (!response.ok) {
    throw new AdminCategoriesApiError(
      typeof body?.message === "string"
        ? body.message
        : "The category administration service is unavailable.",
      response.status,
    );
  }
  return adminCategoryListSchema.parse(body);
}

export async function saveAdminCategory(
  token: string,
  input: SaveAdminCategory,
  categoryId?: string,
) {
  const response = await fetch(
    categoryId
      ? `${apiUrl}/admin/categories/${categoryId}`
      : `${apiUrl}/admin/categories`,
    {
      method: categoryId ? "PUT" : "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    },
  );
  return parseMutationResponse(response);
}

export async function submitAdminCategoryStatus(
  token: string,
  categoryId: string,
  input: AdminCategoryStatusAction,
) {
  const response = await fetch(
    `${apiUrl}/admin/categories/${categoryId}/actions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    },
  );
  return parseMutationResponse(response);
}

async function parseMutationResponse(response: Response) {
  const body = await responseBody(response);
  if (!response.ok) {
    throw new AdminCategoriesApiError(
      typeof body?.message === "string" ? body.message : "Action failed.",
      response.status,
    );
  }
  return body;
}
