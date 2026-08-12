import { config } from "dotenv";
import { resolve } from "node:path";
import {
  and,
  businessMembers,
  businessNotificationEvents,
  businessNotifications,
  businesses,
  businessServices,
  createDatabase,
  customerRequests,
  eq,
  inArray,
  or,
  requestMatches,
  sql,
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
      summary: customerRequests.summary,
      businessId: businesses.id,
      businessStatus: businesses.status,
      businessReviewStatus: businesses.reviewStatus,
    })
    .from(customerRequests)
    .innerJoin(
      businessServices,
      eq(businessServices.categoryId, customerRequests.categoryId),
    )
    .innerJoin(businesses, eq(businesses.id, businessServices.businessId))
    .where(
      and(
        eq(customerRequests.status, "open"),
        eq(businessServices.isAvailable, true),
        or(eq(businesses.status, "draft"), eq(businesses.status, "active")),
        sql`(
          exists (
            select 1 from business_locations match_location
            where match_location.business_id = ${businesses.id}
              and match_location.district_id = ${customerRequests.districtId}
              and match_location.is_active = true
          )
          or exists (
            select 1
            from business_service_fulfillment_options match_option
            left join business_service_coverage_areas match_area
              on match_area.fulfillment_option_id = match_option.id
            where match_option.business_service_id = ${businessServices.id}
              and match_option.is_active = true
              and (
                match_option.coverage_scope in ('nationwide', 'remote')
                or match_area.district_id = ${customerRequests.districtId}
                or match_area.province_id = (
                  select match_district.province_id
                  from districts match_district
                  where match_district.id = ${customerRequests.districtId}
                )
              )
          )
        )`,
      ),
    )
    .groupBy(
      customerRequests.id,
      businesses.id,
      businesses.status,
      businesses.reviewStatus,
    );

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
                "service_area_match",
                candidate.businessStatus === "active"
                  ? "business_active"
                  : "business_pending_review",
              ],
            })),
          )
          .onConflictDoNothing()
          .returning({
            id: requestMatches.id,
            requestId: requestMatches.requestId,
            businessId: requestMatches.businessId,
          });

  const approvedMatches = inserted.filter((match) => {
    const candidate = candidates.find(
      (item) =>
        item.requestId === match.requestId &&
        item.businessId === match.businessId,
    );
    return (
      candidate?.businessStatus === "active" &&
      candidate.businessReviewStatus === "approved"
    );
  });
  const events = approvedMatches.length
    ? await db
        .insert(businessNotificationEvents)
        .values(
          approvedMatches.map((match) => {
            const candidate = candidates.find(
              (item) => item.requestId === match.requestId,
            );
            return {
              businessId: match.businessId,
              type: "request_matched",
              title: "New matched request",
              body: candidate?.summary ?? "A new customer request was matched.",
              actionUrl: "/business/requests",
              eventKey: `request-match:${match.id}`,
              data: { requestId: match.requestId, matchId: match.id },
            };
          }),
        )
        .onConflictDoNothing()
        .returning({
          id: businessNotificationEvents.id,
          businessId: businessNotificationEvents.businessId,
        })
    : [];

  if (events.length) {
    const recipients = await db
      .select({
        businessId: businessMembers.businessId,
        userId: businessMembers.userId,
      })
      .from(businessMembers)
      .where(
        and(
          inArray(
            businessMembers.businessId,
            events.map((event) => event.businessId),
          ),
          inArray(businessMembers.role, ["owner", "manager"]),
        ),
      );
    const notifications = events.flatMap((event) =>
      recipients
        .filter((recipient) => recipient.businessId === event.businessId)
        .map((recipient) => ({
          eventId: event.id,
          recipientUserId: recipient.userId,
        })),
    );
    if (notifications.length) {
      await db
        .insert(businessNotifications)
        .values(notifications)
        .onConflictDoNothing();
    }
  }

  console.log(
    `Found ${candidates.length} eligible pair(s); created ${inserted.length} new queued match(es) and ${events.length} notification event(s).`,
  );
} finally {
  await client.end({ timeout: 5 });
}
