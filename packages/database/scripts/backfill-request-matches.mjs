import { config } from "dotenv";
import { resolve } from "node:path";
import {
  and,
  businessLocations,
  businesses,
  businessServices,
  createDatabase,
  customerRequests,
  eq,
  or,
  requestMatches,
} from "../dist/index.js";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to backfill request matches.");
}

const { client, db } = createDatabase(process.env.DATABASE_URL);

try {
  const candidates = await db
    .select({
      requestId: customerRequests.id,
      businessId: businesses.id,
      businessStatus: businesses.status,
    })
    .from(customerRequests)
    .innerJoin(
      businessServices,
      eq(businessServices.categoryId, customerRequests.categoryId),
    )
    .innerJoin(
      businessLocations,
      and(
        eq(businessLocations.businessId, businessServices.businessId),
        eq(businessLocations.districtId, customerRequests.districtId),
      ),
    )
    .innerJoin(businesses, eq(businesses.id, businessServices.businessId))
    .where(
      and(
        eq(customerRequests.status, "open"),
        eq(businessServices.isAvailable, true),
        eq(businessLocations.isActive, true),
        or(eq(businesses.status, "draft"), eq(businesses.status, "active")),
      ),
    )
    .groupBy(customerRequests.id, businesses.id, businesses.status);

  const inserted =
    candidates.length === 0
      ? []
      : await db
          .insert(requestMatches)
          .values(
            candidates.map((candidate) => ({
              requestId: candidate.requestId,
              businessId: candidate.businessId,
              status: "queued",
              score: candidate.businessStatus === "active" ? "1.000" : "0.800",
              reasons: [
                "category_exact",
                "district_exact",
                candidate.businessStatus === "active"
                  ? "business_active"
                  : "business_pending_review",
              ],
            })),
          )
          .onConflictDoNothing()
          .returning({ id: requestMatches.id });

  console.log(
    `Found ${candidates.length} eligible pair(s); created ${inserted.length} new queued match(es).`,
  );
} finally {
  await client.end({ timeout: 5 });
}
