import { relations, sql } from "drizzle-orm";
import {
  boolean,
  geometry,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name"),
    email: text("email"),
    phone: text("phone"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_phone_unique").on(table.phone),
  ],
);

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
);

export const provinces = pgTable(
  "provinces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (table) => [uniqueIndex("provinces_slug_unique").on(table.slug)],
);

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
  },
  (table) => [
    uniqueIndex("districts_province_slug_unique").on(
      table.provinceId,
      table.slug,
    ),
    index("districts_province_idx").on(table.provinceId),
  ],
);

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
);

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
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("businesses_slug_unique").on(table.slug),
    index("businesses_status_idx").on(table.status),
  ],
);

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
  ],
);

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
);

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
    isAvailable: boolean("is_available").default(true).notNull(),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("business_services_business_idx").on(table.businessId),
    index("business_services_category_idx").on(table.categoryId),
  ],
);

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
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("customer_requests_share_token_unique").on(table.shareToken),
    index("customer_requests_status_idx").on(table.status),
    index("customer_requests_category_idx").on(table.categoryId),
    index("customer_requests_district_idx").on(table.districtId),
  ],
);

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
);

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
);

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
  (table) => [index("interactions_business_idx").on(table.businessId)],
);

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
    isPublished: boolean("is_published").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("reviews_interaction_unique").on(table.interactionId),
    index("reviews_business_published_idx").on(
      table.businessId,
      table.isPublished,
    ),
  ],
);

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
);

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
);

export const businessesRelations = relations(businesses, ({ many }) => ({
  locations: many(businessLocations),
  services: many(businessServices),
  members: many(businessMembers),
  verifications: many(businessVerifications),
  reviews: many(businessReviews),
}));

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
