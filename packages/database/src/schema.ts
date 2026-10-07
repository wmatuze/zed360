import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  geometry,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const businessStatus = pgEnum("business_status", [
  "draft",
  "active",
  "suspended",
  "closed",
]);
export const membershipRole = pgEnum("membership_role", [
  "owner",
  "manager",
  "staff",
]);
export const requestStatus = pgEnum("request_status", [
  "draft",
  "open",
  "matched",
  "resolved",
  "expired",
  "cancelled",
]);
export const matchStatus = pgEnum("match_status", [
  "queued",
  "sent",
  "viewed",
  "responded",
  "declined",
  "expired",
]);
export const responseStatus = pgEnum("response_status", [
  "available",
  "unavailable",
  "needs_more_information",
]);
export const serviceFulfillmentMode = pgEnum("service_fulfillment_mode", [
  "at_business",
  "customer_pickup",
  "business_travel",
  "delivery",
  "remote",
]);
export const serviceCoverageScope = pgEnum("service_coverage_scope", [
  "business_location",
  "selected_districts",
  "selected_provinces",
  "nationwide",
  "remote",
]);
export const verificationType = pgEnum("verification_type", [
  "contact",
  "ownership",
  "registration",
]);
export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
  "expired",
]);
export const platformRole = pgEnum("platform_role", ["admin", "reviewer"]);
export const userAccountStatus = pgEnum("user_account_status", [
  "active",
  "suspended",
]);
export const businessReviewStatus = pgEnum("business_review_status", [
  "pending",
  "approved",
  "rejected",
  "changes_requested",
]);
export const businessReviewDecision = pgEnum("business_review_decision", [
  "approved",
  "rejected",
  "changes_requested",
  "suspended",
  "approval_revoked",
  "reopened",
  "reinstated",
]);
export const catalogItemStatus = pgEnum("catalog_item_status", [
  "active",
  "archived",
]);
export const catalogAvailability = pgEnum("catalog_availability", [
  "available",
  "out_of_stock",
  "made_to_order",
  "contact_business",
]);
export const businessMediaPurpose = pgEnum("business_media_purpose", [
  "logo",
  "cover",
  "gallery",
  "work_sample",
  "product",
]);
export const mediaModerationStatus = pgEnum("media_moderation_status", [
  "pending",
  "approved",
  "rejected",
]);
export const reviewModerationStatus = pgEnum("review_moderation_status", [
  "pending",
  "approved",
  "rejected",
]);
export const businessNotificationType = pgEnum("business_notification_type", [
  "request_matched",
  "customer_selected",
  "business_review_decision",
]);
export const businessProfileRevisionStatus = pgEnum(
  "business_profile_revision_status",
  ["pending", "approved", "rejected"],
);
export const businessAvailabilityStatus = pgEnum(
  "business_availability_status",
  ["available", "busy", "temporarily_unavailable"],
);
export const contentReportTargetType = pgEnum("content_report_target_type", [
  "business",
  "review",
]);
export const contentReportReason = pgEnum("content_report_reason", [
  "misleading",
  "scam_or_fraud",
  "impersonation",
  "prohibited_content",
  "harassment",
  "privacy",
  "spam",
  "other",
]);
export const contentReportStatus = pgEnum("content_report_status", [
  "open",
  "dismissed",
  "actioned",
]);
export const businessActivityEvent = pgEnum("business_activity_event", [
  "profile_view",
  "contact_whatsapp",
  "contact_call",
  "contact_email",
  "contact_website",
  "directions",
  "share",
]);
export const notificationChannel = pgEnum("notification_channel", ["email"]);
export const notificationDeliveryStatus = pgEnum(
  "notification_delivery_status",
  ["pending", "sent", "failed"],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username"),
    displayName: text("display_name"),
    email: text("email"),
    phone: text("phone"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    accountStatus: userAccountStatus("account_status")
      .default("active")
      .notNull(),
    statusReason: text("status_reason"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    // Whether Zed360 may email this person about activity on their businesses.
    emailAlertsEnabled: boolean("email_alerts_enabled").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_username_unique").on(sql`lower(${table.username})`),
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_phone_unique").on(table.phone),
  ],
).enableRLS();

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: platformRole("role").notNull(),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_roles_unique").on(table.userId, table.role),
    index("user_roles_role_idx").on(table.role),
  ],
).enableRLS();

export const adminAuditEvents = pgTable(
  "admin_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    reason: text("reason"),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("admin_audit_events_actor_created_idx").on(
      table.actorUserId,
      table.createdAt,
    ),
    index("admin_audit_events_subject_created_idx").on(
      table.subjectType,
      table.subjectId,
      table.createdAt,
    ),
  ],
).enableRLS();

export const provinces = pgTable(
  "provinces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("provinces_slug_unique").on(table.slug)],
).enableRLS();

export const districts = pgTable(
  "districts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provinceId: uuid("province_id")
      .notNull()
      .references(() => provinces.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    centre: geometry("centre", { type: "point", mode: "xy", srid: 4326 }),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("districts_province_slug_unique").on(
      table.provinceId,
      table.slug,
    ),
    index("districts_province_idx").on(table.provinceId),
  ],
).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    requestSchema: jsonb("request_schema")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_parent_idx").on(table.parentId),
  ],
).enableRLS();

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: businessStatus("status").default("draft").notNull(),
    reviewStatus: businessReviewStatus("review_status")
      .default("pending")
      .notNull(),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    website: text("website"),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    availabilityStatus: businessAvailabilityStatus("availability_status")
      .default("available")
      .notNull(),
    availabilityNote: text("availability_note"),
    availabilityUpdatedAt: timestamp("availability_updated_at", {
      withTimezone: true,
    }),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("businesses_slug_unique").on(table.slug),
    index("businesses_status_idx").on(table.status),
  ],
).enableRLS();

export const businessMembers = pgTable(
  "business_members",
  {
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").default("staff").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("business_members_unique").on(table.businessId, table.userId),
    uniqueIndex("business_members_one_owner_unique")
      .on(table.businessId)
      .where(sql`${table.role} = 'owner'`),
    // The business-media storage policies run as the signed-in user and look
    // up their own memberships here. All other access goes through the API,
    // which connects as the table owner and is not subject to RLS.
    pgPolicy("business_members_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid}`,
    }),
  ],
).enableRLS();

export const businessProfileRevisions = pgTable(
  "business_profile_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    submittedByUserId: uuid("submitted_by_user_id")
      .notNull()
      .references(() => users.id),
    status: businessProfileRevisionStatus("status")
      .default("pending")
      .notNull(),
    proposed: jsonb("proposed")
      .$type<{
        description: string | null;
        phone: string | null;
        whatsapp: string | null;
        email: string | null;
        website: string | null;
      }>()
      .notNull(),
    previous: jsonb("previous").$type<{
      description: string | null;
      phone: string | null;
      whatsapp: string | null;
      email: string | null;
      website: string | null;
    }>(),
    reviewNote: text("review_note"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_profile_revisions_one_pending_unique")
      .on(table.businessId)
      .where(sql`${table.status} = 'pending'`),
    index("business_profile_revisions_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
).enableRLS();

export const businessNotificationEvents = pgTable(
  "business_notification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    type: businessNotificationType("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    actionUrl: text("action_url"),
    eventKey: text("event_key").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("business_notification_events_key_unique").on(table.eventKey),
    index("business_notification_events_business_created_idx").on(
      table.businessId,
      table.createdAt,
    ),
  ],
).enableRLS();

export const businessNotifications = pgTable(
  "business_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => businessNotificationEvents.id, {
        onDelete: "cascade",
      }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("business_notifications_event_recipient_unique").on(
      table.eventId,
      table.recipientUserId,
    ),
    index("business_notifications_recipient_read_idx").on(
      table.recipientUserId,
      table.readAt,
      table.createdAt,
    ),
    index("business_notifications_recipient_archive_idx").on(
      table.recipientUserId,
      table.archivedAt,
      table.createdAt,
    ),
  ],
).enableRLS();

export const contentReports = pgTable(
  "content_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: contentReportTargetType("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: contentReportReason("reason").notNull(),
    details: text("details").notNull(),
    reporterEmail: text("reporter_email"),
    status: contentReportStatus("status").default("open").notNull(),
    decisionNote: text("decision_note"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("content_reports_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    index("content_reports_target_idx").on(table.targetType, table.targetId),
  ],
).enableRLS();

export const businessLocations = pgTable(
  "business_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    districtId: uuid("district_id").references(() => districts.id),
    name: text("name").notNull(),
    address: text("address"),
    coordinates: geometry("coordinates", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }),
    serviceRadiusKm: integer("service_radius_km"),
    openingHours: jsonb("opening_hours")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("business_locations_business_idx").on(table.businessId),
    index("business_locations_district_idx").on(table.districtId),
  ],
).enableRLS();

export const businessServices = pgTable(
  "business_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    description: text("description"),
    priceFrom: numeric("price_from", { precision: 14, scale: 2 }),
    priceTo: numeric("price_to", { precision: 14, scale: 2 }),
    attributes: jsonb("attributes")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    status: catalogItemStatus("status").default("active").notNull(),
    isAvailable: boolean("is_available").default(true).notNull(),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("business_services_business_idx").on(table.businessId),
    index("business_services_category_idx").on(table.categoryId),
  ],
).enableRLS();

export const businessServiceFulfillmentOptions = pgTable(
  "business_service_fulfillment_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessServiceId: uuid("business_service_id")
      .notNull()
      .references(() => businessServices.id, { onDelete: "cascade" }),
    mode: serviceFulfillmentMode("mode").notNull(),
    coverageScope: serviceCoverageScope("coverage_scope").notNull(),
    feeMinimum: numeric("fee_minimum", { precision: 14, scale: 2 }),
    feeMaximum: numeric("fee_maximum", { precision: 14, scale: 2 }),
    leadTimeMinimumDays: integer("lead_time_minimum_days"),
    leadTimeMaximumDays: integer("lead_time_maximum_days"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_service_fulfillment_mode_unique").on(
      table.businessServiceId,
      table.mode,
    ),
    index("business_service_fulfillment_service_idx").on(
      table.businessServiceId,
    ),
    check(
      "business_service_fulfillment_fee_range_check",
      sql`${table.feeMinimum} is null or ${table.feeMaximum} is null or ${table.feeMinimum} <= ${table.feeMaximum}`,
    ),
    check(
      "business_service_fulfillment_lead_range_check",
      sql`${table.leadTimeMinimumDays} is null or ${table.leadTimeMaximumDays} is null or ${table.leadTimeMinimumDays} <= ${table.leadTimeMaximumDays}`,
    ),
  ],
).enableRLS();

export const businessServiceCoverageAreas = pgTable(
  "business_service_coverage_areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fulfillmentOptionId: uuid("fulfillment_option_id")
      .notNull()
      .references(() => businessServiceFulfillmentOptions.id, {
        onDelete: "cascade",
      }),
    provinceId: uuid("province_id").references(() => provinces.id),
    districtId: uuid("district_id").references(() => districts.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("business_service_coverage_district_unique")
      .on(table.fulfillmentOptionId, table.districtId)
      .where(sql`${table.districtId} is not null`),
    uniqueIndex("business_service_coverage_province_unique")
      .on(table.fulfillmentOptionId, table.provinceId)
      .where(sql`${table.provinceId} is not null`),
    index("business_service_coverage_option_idx").on(table.fulfillmentOptionId),
    index("business_service_coverage_district_idx").on(table.districtId),
    index("business_service_coverage_province_idx").on(table.provinceId),
    check(
      "business_service_coverage_one_area_check",
      sql`num_nonnulls(${table.provinceId}, ${table.districtId}) = 1`,
    ),
  ],
).enableRLS();

export const businessProducts = pgTable(
  "business_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceFrom: numeric("price_from", { precision: 14, scale: 2 }),
    priceTo: numeric("price_to", { precision: 14, scale: 2 }),
    availability: catalogAvailability("availability")
      .default("contact_business")
      .notNull(),
    status: catalogItemStatus("status").default("active").notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("business_products_business_status_idx").on(
      table.businessId,
      table.status,
    ),
    check(
      "business_products_price_range_check",
      sql`${table.priceFrom} is null or ${table.priceTo} is null or ${table.priceFrom} <= ${table.priceTo}`,
    ),
  ],
).enableRLS();

export const businessMediaAssets = pgTable(
  "business_media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => businessProducts.id, {
      onDelete: "cascade",
    }),
    purpose: businessMediaPurpose("purpose").notNull(),
    storageBucket: text("storage_bucket").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    title: text("title"),
    altText: text("alt_text").notNull(),
    caption: text("caption"),
    moderationStatus: mediaModerationStatus("moderation_status")
      .default("pending")
      .notNull(),
    moderationNote: text("moderation_note"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_media_storage_object_unique").on(
      table.storageBucket,
      table.storagePath,
    ),
    index("business_media_business_moderation_idx").on(
      table.businessId,
      table.moderationStatus,
    ),
    index("business_media_product_idx").on(table.productId),
    check(
      "business_media_product_purpose_check",
      sql`(${table.purpose} = 'product') = (${table.productId} is not null)`,
    ),
    check(
      "business_media_file_size_check",
      sql`${table.fileSizeBytes} > 0 and ${table.fileSizeBytes} <= 5242880`,
    ),
    check(
      "business_media_dimensions_check",
      sql`(${table.width} is null or ${table.width} > 0) and (${table.height} is null or ${table.height} > 0)`,
    ),
  ],
).enableRLS();

export const customerRequests = pgTable(
  "customer_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    districtId: uuid("district_id").references(() => districts.id),
    status: requestStatus("status").default("draft").notNull(),
    summary: text("summary").notNull(),
    details: text("details"),
    answers: jsonb("answers")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    coordinates: geometry("coordinates", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }),
    neededAt: timestamp("needed_at", { withTimezone: true }),
    budgetMinimum: numeric("budget_minimum", { precision: 14, scale: 2 }),
    budgetMaximum: numeric("budget_maximum", { precision: 14, scale: 2 }),
    shareToken: uuid("share_token").defaultRandom().notNull(),
    // Optional. Used only to tell the customer about responses to this request;
    // never shown to businesses.
    notifyEmail: text("notify_email"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("customer_requests_share_token_unique").on(table.shareToken),
    index("customer_requests_status_idx").on(table.status),
    index("customer_requests_category_idx").on(table.categoryId),
    index("customer_requests_district_idx").on(table.districtId),
  ],
).enableRLS();

export const requestMatches = pgTable(
  "request_matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => customerRequests.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    status: matchStatus("status").default("queued").notNull(),
    score: numeric("score", { precision: 6, scale: 3 }),
    reasons: jsonb("reasons").$type<string[]>().default([]).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("request_matches_unique").on(table.requestId, table.businessId),
    index("request_matches_business_status_idx").on(
      table.businessId,
      table.status,
    ),
  ],
).enableRLS();

export const businessResponses = pgTable(
  "business_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => requestMatches.id, { onDelete: "cascade" }),
    respondedByUserId: uuid("responded_by_user_id").references(() => users.id),
    status: responseStatus("status").notNull(),
    message: text("message"),
    priceMinimum: numeric("price_minimum", { precision: 14, scale: 2 }),
    priceMaximum: numeric("price_maximum", { precision: 14, scale: 2 }),
    availableAt: timestamp("available_at", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("business_responses_match_unique").on(table.matchId)],
).enableRLS();

export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => customerRequests.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    customerUserId: uuid("customer_user_id").references(() => users.id),
    contactedAt: timestamp("contacted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    outcomeConfirmed: boolean("outcome_confirmed").default(false).notNull(),
  },
  (table) => [
    index("interactions_business_idx").on(table.businessId),
    uniqueIndex("interactions_request_business_unique").on(
      table.requestId,
      table.businessId,
    ),
    uniqueIndex("interactions_request_confirmed_unique")
      .on(table.requestId)
      .where(sql`${table.outcomeConfirmed} = true`),
  ],
).enableRLS();

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    interactionId: uuid("interaction_id")
      .notNull()
      .references(() => interactions.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    authorUserId: uuid("author_user_id").references(() => users.id),
    rating: integer("rating").notNull(),
    body: text("body"),
    moderationStatus: reviewModerationStatus("moderation_status")
      .default("pending")
      .notNull(),
    moderationNote: text("moderation_note"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    isPublished: boolean("is_published").default(false).notNull(),
    // Keyed hash of the reviewer's confirmed WhatsApp number. The number
    // itself is never stored. Null for reviews made before verification.
    reviewerContactHash: text("reviewer_contact_hash"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("reviews_interaction_unique").on(table.interactionId),
    index("reviews_business_contact_idx").on(
      table.businessId,
      table.reviewerContactHash,
    ),
    index("reviews_business_published_idx").on(
      table.businessId,
      table.isPublished,
    ),
    index("reviews_moderation_created_idx").on(
      table.moderationStatus,
      table.createdAt,
    ),
    check("reviews_rating_check", sql`${table.rating} between 1 and 5`),
  ],
).enableRLS();

// One row per notification and channel, so a send is attempted, retried, and
// recorded independently of the notification itself. A provider failure never
// affects the request or review that caused the notification.
export const businessNotificationDeliveries = pgTable(
  "business_notification_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => businessNotifications.id, { onDelete: "cascade" }),
    channel: notificationChannel("channel").notNull(),
    status: notificationDeliveryStatus("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    providerMessageId: text("provider_message_id"),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_notification_deliveries_unique").on(
      table.notificationId,
      table.channel,
    ),
    index("business_notification_deliveries_due_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
  ],
).enableRLS();

// Emails to people who have no Zed360 account, such as a customer who asked
// to hear when a business responds. The message is stored ready to send so a
// failed attempt can be retried without rebuilding it. The key makes each
// message send at most once.
export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dedupeKey: text("dedupe_key").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    textBody: text("text_body").notNull(),
    htmlBody: text("html_body").notNull(),
    status: notificationDeliveryStatus("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    providerMessageId: text("provider_message_id"),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("email_outbox_dedupe_unique").on(table.dedupeKey),
    index("email_outbox_due_idx").on(table.status, table.nextAttemptAt),
  ],
).enableRLS();

// Daily totals of public profile activity. Deliberately a counter and not an
// event log: there is no row per visitor, so nothing here can identify or
// follow a customer.
export const businessActivityDaily = pgTable(
  "business_activity_daily",
  {
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    // The calendar day in Zambia (Africa/Lusaka).
    day: date("day", { mode: "string" }).notNull(),
    event: businessActivityEvent("event").notNull(),
    count: integer("count").default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.day, table.event] }),
    index("business_activity_daily_day_idx").on(table.day),
    check("business_activity_daily_count_check", sql`${table.count} >= 0`),
  ],
).enableRLS();

// One-time WhatsApp codes that confirm a reviewer's number. Only hashes are
// stored: a keyed hash of the number and a hash of the code.
export const reviewContactVerifications = pgTable(
  "review_contact_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => customerRequests.id, { onDelete: "cascade" }),
    contactHash: text("contact_hash").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("review_contact_verifications_request_idx").on(
      table.requestId,
      table.createdAt,
    ),
  ],
).enableRLS();

export const reviewResponses = pgTable(
  "review_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    respondedByUserId: uuid("responded_by_user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("review_responses_review_unique").on(table.reviewId),
    index("review_responses_business_idx").on(table.businessId),
  ],
).enableRLS();

export const businessVerifications = pgTable(
  "business_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    type: verificationType("type").notNull(),
    status: verificationStatus("status").default("pending").notNull(),
    evidence: jsonb("evidence")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("business_verifications_business_idx").on(table.businessId),
  ],
).enableRLS();

export const businessReviews = pgTable(
  "business_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    decision: businessReviewDecision("decision").notNull(),
    reason: text("reason"),
    reviewedByUserId: uuid("reviewed_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("business_reviews_business_created_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("business_reviews_reviewer_idx").on(table.reviewedByUserId),
  ],
).enableRLS();

export const businessesRelations = relations(businesses, ({ many }) => ({
  locations: many(businessLocations),
  services: many(businessServices),
  members: many(businessMembers),
  verifications: many(businessVerifications),
  reviews: many(businessReviews),
  products: many(businessProducts),
  media: many(businessMediaAssets),
  customerReviews: many(reviews),
}));

export const businessProductsRelations = relations(
  businessProducts,
  ({ one, many }) => ({
    business: one(businesses, {
      fields: [businessProducts.businessId],
      references: [businesses.id],
    }),
    media: many(businessMediaAssets),
  }),
);

export const businessMediaAssetsRelations = relations(
  businessMediaAssets,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessMediaAssets.businessId],
      references: [businesses.id],
    }),
    product: one(businessProducts, {
      fields: [businessMediaAssets.productId],
      references: [businessProducts.id],
    }),
  }),
);

export const businessServicesRelations = relations(
  businessServices,
  ({ many }) => ({
    fulfillmentOptions: many(businessServiceFulfillmentOptions),
  }),
);

export const businessServiceFulfillmentOptionsRelations = relations(
  businessServiceFulfillmentOptions,
  ({ one, many }) => ({
    service: one(businessServices, {
      fields: [businessServiceFulfillmentOptions.businessServiceId],
      references: [businessServices.id],
    }),
    coverageAreas: many(businessServiceCoverageAreas),
  }),
);

export const customerRequestsRelations = relations(
  customerRequests,
  ({ one, many }) => ({
    category: one(categories, {
      fields: [customerRequests.categoryId],
      references: [categories.id],
    }),
    district: one(districts, {
      fields: [customerRequests.districtId],
      references: [districts.id],
    }),
    matches: many(requestMatches),
  }),
);
