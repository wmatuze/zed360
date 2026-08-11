import "server-only";

import {
  businessCatalogSchema,
  businessMediaUploadIntentSchema,
  type BusinessCatalog,
  type BusinessMediaUploadIntent,
  type CompleteBusinessMediaUpload,
  type CreateBusinessMediaUploadIntent,
  type SaveBusinessProduct,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessCatalogApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parseResponse<T>(
  response: Response,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new BusinessCatalogApiError(
      typeof body?.message === "string"
        ? body.message
        : "The business catalog service is unavailable.",
      response.status,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !parsed.data) {
    throw new BusinessCatalogApiError(
      "The business catalog service returned incomplete information.",
      502,
    );
  }
  return parsed.data;
}

function endpoint(businessId: string, path = "") {
  return `${apiUrl}/business-account/${businessId}/catalog${path}`;
}

function authorized(accessToken: string, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  };
}

export async function fetchBusinessCatalog(
  accessToken: string,
  businessId: string,
): Promise<BusinessCatalog> {
  const response = await fetch(endpoint(businessId), authorized(accessToken));
  return parseResponse(response, businessCatalogSchema);
}

export async function saveBusinessProduct(
  accessToken: string,
  businessId: string,
  productId: string | null,
  product: SaveBusinessProduct,
): Promise<BusinessCatalog> {
  const response = await fetch(
    endpoint(businessId, productId ? `/products/${productId}` : "/products"),
    authorized(accessToken, {
      method: productId ? "PUT" : "POST",
      body: JSON.stringify(product),
    }),
  );
  return parseResponse(response, businessCatalogSchema);
}

export async function requestBusinessMediaUpload(
  accessToken: string,
  businessId: string,
  upload: CreateBusinessMediaUploadIntent,
): Promise<BusinessMediaUploadIntent> {
  const response = await fetch(
    endpoint(businessId, "/media/upload-intents"),
    authorized(accessToken, {
      method: "POST",
      body: JSON.stringify(upload),
    }),
  );
  return parseResponse(response, businessMediaUploadIntentSchema);
}

export async function registerBusinessMedia(
  accessToken: string,
  businessId: string,
  media: CompleteBusinessMediaUpload,
): Promise<BusinessCatalog> {
  const response = await fetch(
    endpoint(businessId, "/media"),
    authorized(accessToken, {
      method: "POST",
      body: JSON.stringify(media),
    }),
  );
  return parseResponse(response, businessCatalogSchema);
}
