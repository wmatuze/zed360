import { z } from "zod";

function zambiaDateKey(date: Date) {
  const centralAfricaOffsetMilliseconds = 2 * 60 * 60 * 1000;
  return new Date(date.getTime() + centralAfricaOffsetMilliseconds)
    .toISOString()
    .slice(0, 10);
}

export const requestTimingSchema = z.enum([
  "as_soon_as_possible",
  "today",
  "this_week",
  "specific_date",
  "flexible",
]);

export const createCustomerRequestSchema = z
  .object({
    summary: z.string().trim().min(10).max(240),
    categoryId: z.string().uuid(),
    districtId: z.string().uuid(),
    timing: requestTimingSchema,
    neededAt: z.coerce.date().optional(),
    budgetMinimum: z.coerce.number().nonnegative().optional(),
    budgetMaximum: z.coerce.number().nonnegative().optional(),
    details: z.string().trim().max(2000).optional(),
    categoryAnswers: z.record(z.string(), z.unknown()).default({}),
  })
  .refine(
    ({ budgetMinimum, budgetMaximum }) =>
      budgetMinimum === undefined ||
      budgetMaximum === undefined ||
      budgetMinimum <= budgetMaximum,
    {
      message: "Minimum budget cannot be greater than maximum budget",
      path: ["budgetMaximum"],
    },
  )
  .refine(
    ({ timing, neededAt }) =>
      timing !== "specific_date" || neededAt !== undefined,
    {
      message: "Choose the date when the request is needed",
      path: ["neededAt"],
    },
  )
  .refine(
    ({ neededAt }) =>
      neededAt === undefined ||
      zambiaDateKey(neededAt) >= zambiaDateKey(new Date()),
    {
      message: "The needed date cannot be in the past",
      path: ["neededAt"],
    },
  );

export type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;

export const referenceCategorySchema: z.ZodType<{
  id: string;
  name: string;
  slug: string;
  children: Array<{ id: string; name: string; slug: string }>;
}> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  children: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
    }),
  ),
});

export const referenceDataSchema = z.object({
  provinces: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      districts: z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          slug: z.string(),
        }),
      ),
    }),
  ),
  categories: z.array(referenceCategorySchema),
});

export type ReferenceData = z.infer<typeof referenceDataSchema>;

export const createdCustomerRequestSchema = z.object({
  id: z.string().uuid(),
  shareToken: z.string().uuid(),
  status: z.literal("open"),
  createdAt: z.string().datetime(),
});

export type CreatedCustomerRequest = z.infer<
  typeof createdCustomerRequestSchema
>;

const optionalContactText = z
  .string()
  .trim()
  .max(160)
  .optional()
  .or(z.literal(""));

export const businessRegistrationStatusSchema = z.enum([
  "registered",
  "not_registered",
  "not_sure",
]);

export const businessEntityTypeSchema = z.enum([
  "business_name",
  "local_company",
  "foreign_company",
  "other",
]);

export const createBusinessApplicationSchema = z
  .object({
    businessName: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1200).optional(),
    categoryId: z.string().uuid(),
    serviceName: z.string().trim().min(2).max(120),
    districtId: z.string().uuid(),
    address: z.string().trim().max(500).optional(),
    phone: optionalContactText,
    whatsapp: optionalContactText,
    email: z.string().trim().email().max(254),
    website: z.string().trim().url().max(500).optional().or(z.literal("")),
    registrationStatus: businessRegistrationStatusSchema,
    registeredLegalName: z.string().trim().max(160).optional(),
    registrationNumber: z.string().trim().max(80).optional(),
    entityType: businessEntityTypeSchema.optional(),
    representativeConfirmed: z.literal(true),
  })
  .superRefine((application, context) => {
    if (application.registrationStatus !== "registered") return;

    for (const [field, value, message] of [
      [
        "registeredLegalName",
        application.registeredLegalName,
        "Enter the exact PACRA-registered legal name",
      ],
      [
        "registrationNumber",
        application.registrationNumber,
        "Enter the PACRA registration number",
      ],
      [
        "entityType",
        application.entityType,
        "Select the registered entity type",
      ],
    ] as const) {
      if (!value) {
        context.addIssue({
          code: "custom",
          path: [field],
          message,
        });
      }
    }
  });

export type CreateBusinessApplication = z.infer<
  typeof createBusinessApplicationSchema
>;

export const createdBusinessApplicationSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("draft"),
  createdAt: z.string().datetime(),
  claimToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

export type CreatedBusinessApplication = z.infer<
  typeof createdBusinessApplicationSchema
>;

export const claimBusinessSchema = z.object({
  businessId: z.string().uuid(),
});

export type ClaimBusiness = z.infer<typeof claimBusinessSchema>;

export const businessApplicationClaimTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/);

export const businessApplicationClaimSchema = z.object({
  token: businessApplicationClaimTokenSchema,
});

export const businessApplicationClaimPreviewSchema = z.object({
  businessId: z.string().uuid(),
  businessName: z.string(),
  submittedEmail: z.string().email(),
  status: z.enum(["ready", "already_connected"]),
});

export type BusinessApplicationClaimPreview = z.infer<
  typeof businessApplicationClaimPreviewSchema
>;

export const businessReviewStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "changes_requested",
]);

export const businessReviewDecisionSchema = z.enum([
  "approved",
  "rejected",
  "changes_requested",
  "suspended",
  "approval_revoked",
  "reopened",
  "reinstated",
]);

export const businessAccountSchema = z.object({
  businesses: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      status: z.enum(["draft", "active", "suspended", "closed"]),
      reviewStatus: businessReviewStatusSchema,
      role: z.enum(["owner", "manager", "staff"]),
      latestReviewReason: z.string().nullable(),
    }),
  ),
  claimableBusinesses: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      createdAt: z.string().datetime(),
    }),
  ),
});

export type BusinessAccount = z.infer<typeof businessAccountSchema>;

export const businessDashboardSchema = z.object({
  totals: z.object({
    openMatches: z.number().int().nonnegative(),
    responsesSent: z.number().int().nonnegative(),
    customerSelections: z.number().int().nonnegative(),
    unreadNotifications: z.number().int().nonnegative(),
  }),
  businesses: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      status: z.enum(["draft", "active", "suspended", "closed"]),
      reviewStatus: businessReviewStatusSchema,
      role: z.enum(["owner", "manager", "staff"]),
      presence: z.object({
        availability: z.enum(["available", "busy", "temporarily_unavailable"]),
        availabilityNote: z.string().nullable(),
        availabilityUpdatedAt: z.string().datetime().nullable(),
        availabilityFreshness: z.enum(["current", "stale", "unconfirmed"]),
        profileLastConfirmedAt: z.string().datetime().nullable(),
        profileFreshness: z.enum(["current", "stale", "unconfirmed"]),
      }),
      metrics: z.object({
        openMatches: z.number().int().nonnegative(),
        responsesSent: z.number().int().nonnegative(),
        customerSelections: z.number().int().nonnegative(),
        publishedProducts: z.number().int().nonnegative(),
        pendingMedia: z.number().int().nonnegative(),
        publishedReviews: z.number().int().nonnegative(),
      }),
      setup: z.object({
        approved: z.boolean(),
        hasAvailableService: z.boolean(),
        hasCoverage: z.boolean(),
        hasPublishedProduct: z.boolean(),
        hasApprovedMedia: z.boolean(),
      }),
    }),
  ),
  recentRequests: z.array(
    z.object({
      matchId: z.string().uuid(),
      businessName: z.string(),
      summary: z.string(),
      categoryName: z.string(),
      districtName: z.string().nullable(),
      hasResponse: z.boolean(),
      createdAt: z.string().datetime(),
    }),
  ),
  recentNotifications: z.array(
    z.object({
      id: z.string().uuid(),
      businessName: z.string(),
      title: z.string(),
      body: z.string(),
      actionUrl: z.string().nullable(),
      readAt: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
});

export type BusinessDashboard = z.infer<typeof businessDashboardSchema>;

export const businessAvailabilityStatusSchema = z.enum([
  "available",
  "busy",
  "temporarily_unavailable",
]);

export const updateBusinessPresenceSchema = z.object({
  availability: businessAvailabilityStatusSchema,
  note: z.string().trim().max(240).optional().or(z.literal("")),
});
export type UpdateBusinessPresence = z.infer<
  typeof updateBusinessPresenceSchema
>;

const freshnessStateSchema = z.enum(["current", "stale", "unconfirmed"]);

export const businessPresenceSchema = z.object({
  business: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
  availability: z.object({
    status: businessAvailabilityStatusSchema,
    note: z.string().nullable(),
    updatedAt: z.string().datetime().nullable(),
    freshness: freshnessStateSchema,
  }),
  profile: z.object({
    lastConfirmedAt: z.string().datetime().nullable(),
    freshness: freshnessStateSchema,
  }),
});
export type BusinessPresence = z.infer<typeof businessPresenceSchema>;

export const operatingHoursDaySchema = z.discriminatedUnion("status", [
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    status: z.literal("closed"),
  }),
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    status: z.literal("open_24_hours"),
  }),
  z
    .object({
      dayOfWeek: z.number().int().min(0).max(6),
      status: z.literal("hours"),
      opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    })
    .refine(({ opensAt, closesAt }) => opensAt !== closesAt, {
      message: "Opening and closing times must be different.",
      path: ["closesAt"],
    }),
]);
export type OperatingHoursDay = z.infer<typeof operatingHoursDaySchema>;

export const updateLocationOperatingHoursSchema = z
  .object({ days: z.array(operatingHoursDaySchema).length(7) })
  .superRefine(({ days }, context) => {
    if (new Set(days.map(({ dayOfWeek }) => dayOfWeek)).size !== 7) {
      context.addIssue({
        code: "custom",
        message: "Provide one schedule for every day of the week.",
        path: ["days"],
      });
    }
  });
export type UpdateLocationOperatingHours = z.infer<
  typeof updateLocationOperatingHoursSchema
>;

const locationOperatingHoursSchema = z.object({
  configured: z.boolean(),
  days: z.array(operatingHoursDaySchema).length(7),
});

export const businessOperatingHoursSchema = z.object({
  business: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
  timezone: z.literal("Africa/Lusaka"),
  locations: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      isPrimary: z.boolean(),
      districtName: z.string().nullable(),
      operatingHours: locationOperatingHoursSchema,
    }),
  ),
});
export type BusinessOperatingHours = z.infer<
  typeof businessOperatingHoursSchema
>;

export const saveBusinessLocationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  districtId: z.string().uuid(),
});
export type SaveBusinessLocation = z.infer<typeof saveBusinessLocationSchema>;

export const businessLocationStatusSchema = z.object({
  isActive: z.boolean(),
});

export const businessLocationManagementSchema = z.object({
  business: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
  locations: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      address: z.string().nullable(),
      districtId: z.string().uuid().nullable(),
      districtName: z.string().nullable(),
      provinceName: z.string().nullable(),
      isPrimary: z.boolean(),
      isActive: z.boolean(),
      operatingHoursConfigured: z.boolean(),
    }),
  ),
});
export type BusinessLocationManagement = z.infer<
  typeof businessLocationManagementSchema
>;

export const contentReportTargetTypeSchema = z.enum(["business", "review"]);
export const contentReportReasonSchema = z.enum([
  "misleading",
  "scam_or_fraud",
  "impersonation",
  "prohibited_content",
  "harassment",
  "privacy",
  "spam",
  "other",
]);

export const submitContentReportSchema = z.object({
  targetType: contentReportTargetTypeSchema,
  targetId: z.string().uuid(),
  reason: contentReportReasonSchema,
  details: z.string().trim().min(20).max(1200),
  reporterEmail: z
    .string()
    .trim()
    .email()
    .max(254)
    .optional()
    .or(z.literal("")),
  website: z.literal("").optional(),
});
export type SubmitContentReport = z.infer<typeof submitContentReportSchema>;

export const contentReportDecisionSchema = z.object({
  decision: z.enum(["dismissed", "content_removed", "business_suspended"]),
  note: z.string().trim().min(10).max(1200),
});
export type ContentReportDecision = z.infer<typeof contentReportDecisionSchema>;

export const adminContentReportQueueSchema = z.object({
  viewerRole: z.enum(["admin", "reviewer"]),
  reports: z.array(
    z.object({
      id: z.string().uuid(),
      targetType: contentReportTargetTypeSchema,
      targetId: z.string().uuid(),
      targetLabel: z.string(),
      targetSlug: z.string().nullable(),
      reason: contentReportReasonSchema,
      details: z.string(),
      reporterEmail: z.string().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
});
export type AdminContentReportQueue = z.infer<
  typeof adminContentReportQueueSchema
>;

export const saveBusinessProfileSchema = z
  .object({
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    website: z.string().trim().url().max(500).optional().or(z.literal("")),
  })
  .refine(
    ({ website }) =>
      !website ||
      (URL.canParse(website) &&
        ["http:", "https:"].includes(new URL(website).protocol)),
    {
      path: ["website"],
      message: "Website links must use http or https.",
    },
  );
export type SaveBusinessProfile = z.infer<typeof saveBusinessProfileSchema>;

const businessProfileFieldsSchema = z.object({
  description: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
});

export const businessProfileManagementSchema = z.object({
  business: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    status: z.enum(["draft", "active", "suspended", "closed"]),
    reviewStatus: businessReviewStatusSchema,
  }),
  current: businessProfileFieldsSchema,
  pending: z
    .object({
      id: z.string().uuid(),
      proposed: businessProfileFieldsSchema,
      createdAt: z.string().datetime(),
    })
    .nullable(),
  latestDecision: z
    .object({
      status: z.enum(["approved", "rejected"]),
      note: z.string().nullable(),
    })
    .nullable(),
});
export type BusinessProfileManagement = z.infer<
  typeof businessProfileManagementSchema
>;

export const businessProfileDecisionSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    note: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine(({ decision, note }) => decision === "approved" || Boolean(note), {
    path: ["note"],
    message: "Explain why the profile changes were rejected.",
  });
export type BusinessProfileDecision = z.infer<
  typeof businessProfileDecisionSchema
>;
export const adminBusinessProfileRevisionQueueSchema = z.object({
  viewerRole: z.enum(["admin", "reviewer"]),
  revisions: z.array(
    z.object({
      id: z.string().uuid(),
      businessId: z.string().uuid(),
      businessName: z.string(),
      current: businessProfileFieldsSchema,
      proposed: businessProfileFieldsSchema,
      createdAt: z.string().datetime(),
    }),
  ),
});
export type AdminBusinessProfileRevisionQueue = z.infer<
  typeof adminBusinessProfileRevisionQueueSchema
>;

export const serviceFulfillmentModeSchema = z.enum([
  "at_business",
  "customer_pickup",
  "business_travel",
  "delivery",
  "remote",
]);

export const serviceCoverageScopeSchema = z.enum([
  "business_location",
  "selected_districts",
  "selected_provinces",
  "nationwide",
  "remote",
]);

export const serviceCoverageOptionInputSchema = z
  .object({
    mode: serviceFulfillmentModeSchema,
    coverageScope: serviceCoverageScopeSchema,
    districtIds: z.array(z.string().uuid()).max(50).default([]),
    provinceIds: z.array(z.string().uuid()).max(10).default([]),
    feeMinimum: z.coerce.number().nonnegative().optional(),
    feeMaximum: z.coerce.number().nonnegative().optional(),
    leadTimeMinimumDays: z.coerce
      .number()
      .int()
      .nonnegative()
      .max(365)
      .optional(),
    leadTimeMaximumDays: z.coerce
      .number()
      .int()
      .nonnegative()
      .max(365)
      .optional(),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((option, context) => {
    const expectedScope =
      option.mode === "at_business" || option.mode === "customer_pickup"
        ? "business_location"
        : option.mode === "remote"
          ? "remote"
          : null;
    if (expectedScope && option.coverageScope !== expectedScope) {
      context.addIssue({
        code: "custom",
        path: ["coverageScope"],
        message: `This fulfilment mode requires ${expectedScope.replace("_", " ")} coverage.`,
      });
    }
    if (
      (option.mode === "business_travel" || option.mode === "delivery") &&
      !["selected_districts", "selected_provinces", "nationwide"].includes(
        option.coverageScope,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["coverageScope"],
        message:
          "Choose selected districts, selected provinces, or nationwide.",
      });
    }
    if (
      option.coverageScope === "selected_districts" &&
      option.districtIds.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["districtIds"],
        message: "Choose at least one district.",
      });
    }
    if (
      option.coverageScope === "selected_provinces" &&
      option.provinceIds.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["provinceIds"],
        message: "Choose at least one province.",
      });
    }
    if (
      option.feeMinimum !== undefined &&
      option.feeMaximum !== undefined &&
      option.feeMinimum > option.feeMaximum
    ) {
      context.addIssue({
        code: "custom",
        path: ["feeMaximum"],
        message: "Minimum fee cannot be greater than maximum fee.",
      });
    }
    if (
      option.leadTimeMinimumDays !== undefined &&
      option.leadTimeMaximumDays !== undefined &&
      option.leadTimeMinimumDays > option.leadTimeMaximumDays
    ) {
      context.addIssue({
        code: "custom",
        path: ["leadTimeMaximumDays"],
        message: "Minimum delivery time cannot exceed maximum delivery time.",
      });
    }
  });

export const updateBusinessServiceCoverageSchema = z
  .object({
    options: z.array(serviceCoverageOptionInputSchema).max(5),
  })
  .superRefine(({ options }, context) => {
    const modes = new Set<string>();
    for (const [index, option] of options.entries()) {
      if (modes.has(option.mode)) {
        context.addIssue({
          code: "custom",
          path: ["options", index, "mode"],
          message: "Each fulfilment mode can only be configured once.",
        });
      }
      modes.add(option.mode);
    }
  });

export type UpdateBusinessServiceCoverage = z.infer<
  typeof updateBusinessServiceCoverageSchema
>;

export const businessServiceCoverageSchema = z.object({
  business: z.object({ id: z.string().uuid(), name: z.string() }),
  services: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      categoryName: z.string(),
      options: z.array(
        z.object({
          id: z.string().uuid(),
          mode: serviceFulfillmentModeSchema,
          coverageScope: serviceCoverageScopeSchema,
          districtIds: z.array(z.string().uuid()),
          provinceIds: z.array(z.string().uuid()),
          feeMinimum: z.number().nonnegative().nullable(),
          feeMaximum: z.number().nonnegative().nullable(),
          leadTimeMinimumDays: z.number().int().nonnegative().nullable(),
          leadTimeMaximumDays: z.number().int().nonnegative().nullable(),
          notes: z.string().nullable(),
          lastConfirmedAt: z.string().datetime().nullable(),
        }),
      ),
    }),
  ),
});

export type BusinessServiceCoverage = z.infer<
  typeof businessServiceCoverageSchema
>;

export const catalogAvailabilitySchema = z.enum([
  "available",
  "out_of_stock",
  "made_to_order",
  "contact_business",
]);

export const catalogItemStatusSchema = z.enum(["active", "archived"]);

export const saveBusinessServiceSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    priceFrom: z.coerce.number().nonnegative().optional(),
    priceTo: z.coerce.number().nonnegative().optional(),
    isAvailable: z.boolean().default(true),
    status: catalogItemStatusSchema.default("active"),
  })
  .refine(
    ({ priceFrom, priceTo }) =>
      priceFrom === undefined || priceTo === undefined || priceFrom <= priceTo,
    {
      path: ["priceTo"],
      message: "Minimum price cannot be greater than maximum price.",
    },
  );

export type SaveBusinessService = z.infer<typeof saveBusinessServiceSchema>;

export const businessServiceManagementSchema = z.object({
  business: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
  services: z.array(
    z.object({
      id: z.string().uuid(),
      categoryId: z.string().uuid(),
      categoryName: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      priceFrom: z.number().nonnegative().nullable(),
      priceTo: z.number().nonnegative().nullable(),
      isAvailable: z.boolean(),
      status: catalogItemStatusSchema,
      lastConfirmedAt: z.string().datetime().nullable(),
      coverageModes: z.number().int().nonnegative(),
    }),
  ),
});

export type BusinessServiceManagement = z.infer<
  typeof businessServiceManagementSchema
>;

export const businessMediaPurposeSchema = z.enum([
  "logo",
  "cover",
  "gallery",
  "work_sample",
  "product",
]);
export const mediaModerationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const saveBusinessProductSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1200).optional().or(z.literal("")),
    priceFrom: z.coerce.number().nonnegative().optional(),
    priceTo: z.coerce.number().nonnegative().optional(),
    availability: catalogAvailabilitySchema,
    status: catalogItemStatusSchema.default("active"),
    isPublished: z.boolean().default(false),
  })
  .refine(
    ({ priceFrom, priceTo }) =>
      priceFrom === undefined || priceTo === undefined || priceFrom <= priceTo,
    {
      path: ["priceTo"],
      message: "Minimum price cannot be greater than maximum price.",
    },
  );

export type SaveBusinessProduct = z.infer<typeof saveBusinessProductSchema>;

const allowedBusinessImageTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const createBusinessMediaUploadIntentSchema = z
  .object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: allowedBusinessImageTypeSchema,
    fileSizeBytes: z.coerce
      .number()
      .int()
      .positive()
      .max(5 * 1024 * 1024),
    purpose: businessMediaPurposeSchema,
    productId: z.string().uuid().optional(),
  })
  .refine(
    ({ purpose, productId }) =>
      purpose === "product" ? Boolean(productId) : !productId,
    {
      path: ["productId"],
      message: "Product images must be linked to one product.",
    },
  );

export type CreateBusinessMediaUploadIntent = z.infer<
  typeof createBusinessMediaUploadIntentSchema
>;

export const businessMediaUploadIntentSchema = z.object({
  bucket: z.string(),
  path: z.string(),
});

export type BusinessMediaUploadIntent = z.infer<
  typeof businessMediaUploadIntentSchema
>;

export const completeBusinessMediaUploadSchema = z
  .object({
    storagePath: z.string().trim().min(1).max(500),
    mimeType: allowedBusinessImageTypeSchema,
    fileSizeBytes: z.coerce
      .number()
      .int()
      .positive()
      .max(5 * 1024 * 1024),
    width: z.coerce.number().int().positive().max(12000).optional(),
    height: z.coerce.number().int().positive().max(12000).optional(),
    purpose: businessMediaPurposeSchema,
    productId: z.string().uuid().optional(),
    title: z.string().trim().max(120).optional().or(z.literal("")),
    altText: z.string().trim().min(3).max(180),
    caption: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(
    ({ purpose, productId }) =>
      purpose === "product" ? Boolean(productId) : !productId,
    {
      path: ["productId"],
      message: "Product images must be linked to one product.",
    },
  );

export type CompleteBusinessMediaUpload = z.infer<
  typeof completeBusinessMediaUploadSchema
>;

export const businessMediaAssetSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  purpose: businessMediaPurposeSchema,
  url: z.string().url(),
  mimeType: allowedBusinessImageTypeSchema,
  fileSizeBytes: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  title: z.string().nullable(),
  altText: z.string(),
  caption: z.string().nullable(),
  moderationStatus: mediaModerationStatusSchema,
  moderationNote: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const businessCatalogProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  priceFrom: z.number().nonnegative().nullable(),
  priceTo: z.number().nonnegative().nullable(),
  availability: catalogAvailabilitySchema,
  status: catalogItemStatusSchema,
  isPublished: z.boolean(),
  lastConfirmedAt: z.string().datetime().nullable(),
  media: z.array(businessMediaAssetSchema),
});

export const businessCatalogSchema = z.object({
  business: z.object({ id: z.string().uuid(), name: z.string() }),
  bucket: z.string(),
  products: z.array(businessCatalogProductSchema),
  media: z.array(businessMediaAssetSchema),
});

export type BusinessCatalog = z.infer<typeof businessCatalogSchema>;

export const submitMediaReviewSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(({ decision, note }) => decision !== "rejected" || Boolean(note), {
    path: ["note"],
    message: "Explain why this image is being rejected.",
  });

export type SubmitMediaReview = z.infer<typeof submitMediaReviewSchema>;

export const adminMediaReviewQueueSchema = z.object({
  viewerRole: z.enum(["admin", "reviewer"]),
  media: z.array(
    businessMediaAssetSchema.extend({
      business: z.object({ id: z.string().uuid(), name: z.string() }),
      productName: z.string().nullable(),
    }),
  ),
});

export type AdminMediaReviewQueue = z.infer<typeof adminMediaReviewQueueSchema>;

export const reviewModerationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const submitCustomerReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().max(1200).optional().or(z.literal("")),
});

export type SubmitCustomerReview = z.infer<typeof submitCustomerReviewSchema>;

export const customerReviewSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().nullable(),
  moderationStatus: reviewModerationStatusSchema,
  moderationNote: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const adminAccessSchema = z.object({
  role: z.enum(["admin", "reviewer"]),
});

export type AdminAccess = z.infer<typeof adminAccessSchema>;

export const adminUserListQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminUserActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("role_granted"),
    role: z.enum(["admin", "reviewer"]),
    reason: z.string().trim().min(10).max(1200),
  }),
  z.object({
    action: z.literal("role_revoked"),
    role: z.enum(["admin", "reviewer"]),
    reason: z.string().trim().min(10).max(1200),
  }),
  z.object({
    action: z.literal("suspended"),
    reason: z.string().trim().min(10).max(1200),
  }),
  z.object({
    action: z.literal("reinstated"),
    reason: z.string().trim().min(10).max(1200),
  }),
]);

export type AdminUserAction = z.infer<typeof adminUserActionSchema>;

export const adminUserSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  accountStatus: z.enum(["active", "suspended"]),
  statusReason: z.string().nullable(),
  roles: z.array(z.enum(["admin", "reviewer"])),
  businessCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const adminUserListSchema = z.object({
  viewerRole: z.literal("admin"),
  users: z.array(adminUserSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type AdminUserList = z.infer<typeof adminUserListSchema>;

export const adminCategoryListQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  status: z.enum(["all", "active", "inactive"]).default("all"),
});

export type AdminCategoryListQuery = z.infer<
  typeof adminCategoryListQuerySchema
>;

const categoryParentIdSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().uuid().nullable(),
);

export const saveAdminCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  parentId: categoryParentIdSchema,
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

export type SaveAdminCategory = z.infer<typeof saveAdminCategorySchema>;

export const adminCategoryStatusActionSchema = z.object({
  action: z.enum(["activated", "deactivated"]),
  reason: z.string().trim().min(10).max(1200),
});

export type AdminCategoryStatusAction = z.infer<
  typeof adminCategoryStatusActionSchema
>;

export const adminCategorySchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  parentName: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  childCount: z.number().int().nonnegative(),
  activeChildCount: z.number().int().nonnegative(),
  serviceCount: z.number().int().nonnegative(),
  requestCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const adminCategoryListSchema = z.object({
  viewerRole: z.enum(["admin", "reviewer"]),
  categories: z.array(adminCategorySchema),
  parents: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      isActive: z.boolean(),
    }),
  ),
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  inactive: z.number().int().nonnegative(),
});

export type AdminCategoryList = z.infer<typeof adminCategoryListSchema>;

export const adminLocationListQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  provinceId: z.string().uuid().optional(),
});
export type AdminLocationListQuery = z.infer<
  typeof adminLocationListQuerySchema
>;

const locationNameSchema = z.string().trim().min(2).max(120);
const locationSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const saveAdminProvinceSchema = z.object({
  name: locationNameSchema,
  slug: locationSlugSchema,
});
export type SaveAdminProvince = z.infer<typeof saveAdminProvinceSchema>;

export const saveAdminDistrictSchema = z.object({
  provinceId: z.string().uuid(),
  name: locationNameSchema,
  slug: locationSlugSchema,
});
export type SaveAdminDistrict = z.infer<typeof saveAdminDistrictSchema>;

export const adminLocationStatusActionSchema = z.object({
  action: z.enum(["activated", "deactivated"]),
  reason: z.string().trim().min(10).max(1200),
});
export type AdminLocationStatusAction = z.infer<
  typeof adminLocationStatusActionSchema
>;

export const adminDistrictSchema = z.object({
  id: z.string().uuid(),
  provinceId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  locationCount: z.number().int().nonnegative(),
  requestCount: z.number().int().nonnegative(),
  coverageCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export const adminProvinceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  districtCount: z.number().int().nonnegative(),
  activeDistrictCount: z.number().int().nonnegative(),
  coverageCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  districts: z.array(adminDistrictSchema),
});

export const adminLocationListSchema = z.object({
  viewerRole: z.enum(["admin", "reviewer"]),
  provinces: z.array(adminProvinceSchema),
  totalProvinces: z.number().int().nonnegative(),
  totalDistricts: z.number().int().nonnegative(),
});
export type AdminLocationList = z.infer<typeof adminLocationListSchema>;

export const saveBusinessReviewResponseSchema = z.object({
  body: z.string().trim().min(2).max(1200),
});

export type SaveBusinessReviewResponse = z.infer<
  typeof saveBusinessReviewResponseSchema
>;

const businessReviewResponseSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const businessCustomerReviewsSchema = z.object({
  business: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
  reviews: z.array(
    z.object({
      id: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      body: z.string().nullable(),
      createdAt: z.string().datetime(),
      response: businessReviewResponseSchema.nullable(),
    }),
  ),
});

export type BusinessCustomerReviews = z.infer<
  typeof businessCustomerReviewsSchema
>;

export const submitCustomerReviewDecisionSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(({ decision, note }) => decision !== "rejected" || Boolean(note), {
    path: ["note"],
    message: "Explain why this review is being rejected.",
  });

export type SubmitCustomerReviewDecision = z.infer<
  typeof submitCustomerReviewDecisionSchema
>;

export const adminCustomerReviewQueueSchema = z.object({
  viewerRole: z.enum(["admin", "reviewer"]),
  reviews: z.array(
    customerReviewSchema.extend({
      business: z.object({ id: z.string().uuid(), name: z.string() }),
    }),
  ),
});

export type AdminCustomerReviewQueue = z.infer<
  typeof adminCustomerReviewQueueSchema
>;

export const publicBusinessDirectoryQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  province: z.string().trim().max(120).optional(),
  district: z.string().uuid().optional(),
  fulfillment: serviceFulfillmentModeSchema.optional(),
  page: z.coerce.number().int().positive().max(1000).default(1),
});

export type PublicBusinessDirectoryQuery = z.infer<
  typeof publicBusinessDirectoryQuerySchema
>;

const publicBusinessTrustSchema = z.object({
  contactVerified: z.boolean(),
  registrationVerified: z.boolean(),
});

const publicBusinessLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable(),
  isPrimary: z.boolean(),
  district: z
    .object({
      name: z.string(),
      slug: z.string(),
      provinceName: z.string(),
      provinceSlug: z.string(),
    })
    .nullable(),
  operatingHours: locationOperatingHoursSchema.extend({
    currentStatus: z.enum([
      "open",
      "closed",
      "temporarily_unavailable",
      "unknown",
    ]),
    currentLabel: z.string(),
    todayLabel: z.string(),
  }),
});

const publicBusinessCoverageAreaSchema = z.object({
  name: z.string(),
  slug: z.string(),
});

const publicBusinessFulfillmentOptionSchema = z.object({
  mode: serviceFulfillmentModeSchema,
  coverageScope: serviceCoverageScopeSchema,
  feeMinimum: z.number().nonnegative().nullable(),
  feeMaximum: z.number().nonnegative().nullable(),
  leadTimeMinimumDays: z.number().int().nonnegative().nullable(),
  leadTimeMaximumDays: z.number().int().nonnegative().nullable(),
  notes: z.string().nullable(),
  districts: z.array(publicBusinessCoverageAreaSchema),
  provinces: z.array(publicBusinessCoverageAreaSchema),
});

const publicBusinessServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.object({ name: z.string(), slug: z.string() }),
  priceFrom: z.number().nonnegative().nullable(),
  priceTo: z.number().nonnegative().nullable(),
  lastConfirmedAt: z.string().datetime().nullable(),
  fulfillment: z.array(publicBusinessFulfillmentOptionSchema),
});

const publicBusinessMediaSchema = businessMediaAssetSchema.omit({
  moderationStatus: true,
  moderationNote: true,
});

const publicBusinessProductSchema = businessCatalogProductSchema
  .omit({ status: true, isPublished: true, lastConfirmedAt: true, media: true })
  .extend({ media: z.array(publicBusinessMediaSchema) });

const publicCustomerReviewSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().nullable(),
  createdAt: z.string().datetime(),
  verifiedInteraction: z.literal(true),
  response: businessReviewResponseSchema.nullable(),
});

export const publicBusinessSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  lastConfirmedAt: z.string().datetime().nullable(),
  availability: businessAvailabilityStatusSchema,
  availabilityNote: z.string().nullable(),
  availabilityUpdatedAt: z.string().datetime().nullable(),
  availabilityFreshness: freshnessStateSchema,
  profileFreshness: freshnessStateSchema,
  trust: publicBusinessTrustSchema,
  primaryLocation: publicBusinessLocationSchema.nullable(),
  categories: z.array(z.object({ name: z.string(), slug: z.string() })),
  serviceNames: z.array(z.string()),
  fulfillmentModes: z.array(serviceFulfillmentModeSchema),
});

export const publicBusinessDirectorySchema = z.object({
  businesses: z.array(publicBusinessSummarySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type PublicBusinessDirectory = z.infer<
  typeof publicBusinessDirectorySchema
>;

export const publicBusinessProfileSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  lastConfirmedAt: z.string().datetime().nullable(),
  availability: businessAvailabilityStatusSchema,
  availabilityNote: z.string().nullable(),
  availabilityUpdatedAt: z.string().datetime().nullable(),
  availabilityFreshness: freshnessStateSchema,
  profileFreshness: freshnessStateSchema,
  trust: publicBusinessTrustSchema,
  locations: z.array(publicBusinessLocationSchema),
  services: z.array(publicBusinessServiceSchema),
  gallery: z.array(publicBusinessMediaSchema),
  products: z.array(publicBusinessProductSchema),
  reviewSummary: z.object({
    averageRating: z.number().min(1).max(5).nullable(),
    reviewCount: z.number().int().nonnegative(),
  }),
  reviews: z.array(publicCustomerReviewSchema),
});

export type PublicBusinessProfile = z.infer<typeof publicBusinessProfileSchema>;

export const publicBusinessComparisonQuerySchema = z.object({
  slugs: z
    .string()
    .trim()
    .transform((value) => [
      ...new Set(
        value
          .split(",")
          .map((slug) => slug.trim())
          .filter(Boolean),
      ),
    ])
    .pipe(
      z
        .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
        .min(2)
        .max(3),
    ),
});
export type PublicBusinessComparisonQuery = z.infer<
  typeof publicBusinessComparisonQuerySchema
>;

export const publicBusinessComparisonSchema = z.object({
  businesses: z.array(publicBusinessProfileSchema).min(2).max(3),
});
export type PublicBusinessComparison = z.infer<
  typeof publicBusinessComparisonSchema
>;

export const businessRequestMatchStatusSchema = z.enum([
  "queued",
  "sent",
  "viewed",
  "responded",
  "declined",
  "expired",
]);

export const matchedBusinessRequestSchema = z.object({
  matchId: z.string().uuid(),
  business: z.object({
    id: z.string().uuid(),
    name: z.string(),
    role: z.enum(["owner", "manager", "staff"]),
  }),
  matchStatus: businessRequestMatchStatusSchema,
  request: z.object({
    id: z.string().uuid(),
    summary: z.string(),
    details: z.string().nullable(),
    categoryName: z.string(),
    districtName: z.string().nullable(),
    timing: requestTimingSchema.nullable(),
    neededAt: z.string().datetime().nullable(),
    budgetMinimum: z.number().nonnegative().nullable(),
    budgetMaximum: z.number().nonnegative().nullable(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime().nullable(),
  }),
  response: z
    .object({
      id: z.string().uuid(),
      status: z.enum(["available", "unavailable", "needs_more_information"]),
      message: z.string(),
      priceMinimum: z.number().nonnegative().nullable(),
      priceMaximum: z.number().nonnegative().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    })
    .nullable(),
});

export const matchedBusinessRequestsSchema = z.object({
  requests: z.array(matchedBusinessRequestSchema),
});

export type MatchedBusinessRequest = z.infer<
  typeof matchedBusinessRequestSchema
>;
export type MatchedBusinessRequests = z.infer<
  typeof matchedBusinessRequestsSchema
>;

export const submitBusinessResponseSchema = z
  .object({
    status: z.enum(["available", "unavailable", "needs_more_information"]),
    message: z.string().trim().min(10).max(1200),
    priceMinimum: z.coerce.number().nonnegative().optional(),
    priceMaximum: z.coerce.number().nonnegative().optional(),
  })
  .refine(
    ({ priceMinimum, priceMaximum }) =>
      priceMinimum === undefined ||
      priceMaximum === undefined ||
      priceMinimum <= priceMaximum,
    {
      message: "Minimum price cannot be greater than maximum price",
      path: ["priceMaximum"],
    },
  );

export type SubmitBusinessResponse = z.infer<
  typeof submitBusinessResponseSchema
>;

export const submittedBusinessResponseSchema = z.object({
  matchId: z.string().uuid(),
  response: matchedBusinessRequestSchema.shape.response.unwrap(),
});

export type SubmittedBusinessResponse = z.infer<
  typeof submittedBusinessResponseSchema
>;

export const customerRequestOutcomeActionSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("contacted"),
      matchId: z.string().uuid(),
    }),
    z.object({
      action: z.literal("chosen"),
      matchId: z.string().uuid(),
    }),
    z.object({ action: z.literal("closed_without_choice") }),
    z.object({ action: z.literal("reopened") }),
  ],
);

export type CustomerRequestOutcomeAction = z.infer<
  typeof customerRequestOutcomeActionSchema
>;

export const sharedCustomerRequestSchema = z.object({
  request: z.object({
    id: z.string().uuid(),
    summary: z.string(),
    details: z.string().nullable(),
    status: z.enum(["open", "matched", "resolved", "expired", "cancelled"]),
    categoryName: z.string(),
    districtName: z.string().nullable(),
    timing: requestTimingSchema.nullable(),
    neededAt: z.string().datetime().nullable(),
    budgetMinimum: z.number().nonnegative().nullable(),
    budgetMaximum: z.number().nonnegative().nullable(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime().nullable(),
  }),
  responses: z.array(
    z.object({
      matchId: z.string().uuid(),
      status: z.enum(["available", "unavailable", "needs_more_information"]),
      message: z.string(),
      priceMinimum: z.number().nonnegative().nullable(),
      priceMaximum: z.number().nonnegative().nullable(),
      updatedAt: z.string().datetime(),
      business: z.object({
        id: z.string().uuid(),
        name: z.string(),
        description: z.string().nullable(),
        phone: z.string().nullable(),
        whatsapp: z.string().nullable(),
        email: z.string().nullable(),
        website: z.string().nullable(),
      }),
    }),
  ),
  outcome: z.object({
    contactedBusinessIds: z.array(z.string().uuid()),
    selectedBusinessId: z.string().uuid().nullable(),
  }),
  review: customerReviewSchema.nullable(),
});

export type SharedCustomerRequest = z.infer<typeof sharedCustomerRequestSchema>;

export const businessNotificationTypeSchema = z.enum([
  "request_matched",
  "customer_selected",
  "business_review_decision",
]);

export const businessNotificationSchema = z.object({
  id: z.string().uuid(),
  type: businessNotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  actionUrl: z.string().nullable(),
  business: z.object({ id: z.string().uuid(), name: z.string() }),
  readAt: z.string().datetime().nullable(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const businessNotificationListSchema = z.object({
  notifications: z.array(businessNotificationSchema),
  unreadCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  view: z.enum(["inbox", "archived"]),
});

export type BusinessNotificationList = z.infer<
  typeof businessNotificationListSchema
>;

export const submitBusinessReviewSchema = z
  .object({
    decision: businessReviewDecisionSchema,
    reason: z.string().trim().max(1200).optional().or(z.literal("")),
  })
  .superRefine(({ decision, reason }, context) => {
    if (
      decision !== "approved" &&
      decision !== "reopened" &&
      decision !== "reinstated" &&
      (!reason || reason.length < 10)
    ) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Provide a clear reason of at least 10 characters.",
      });
    }
  });

export type SubmitBusinessReview = z.infer<typeof submitBusinessReviewSchema>;

const nullableTextSchema = z.string().nullable();

export const adminBusinessReviewItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: nullableTextSchema,
  status: z.enum(["draft", "active", "suspended", "closed"]),
  reviewStatus: businessReviewStatusSchema,
  createdAt: z.string().datetime(),
  contact: z.object({
    email: nullableTextSchema,
    phone: nullableTextSchema,
    whatsapp: nullableTextSchema,
    website: nullableTextSchema,
  }),
  ownerEmail: nullableTextSchema,
  services: z.array(z.object({ name: z.string(), categoryName: z.string() })),
  locations: z.array(
    z.object({
      name: z.string(),
      address: nullableTextSchema,
      districtName: nullableTextSchema,
      provinceName: nullableTextSchema,
    }),
  ),
  registration: z
    .object({
      status: z.enum(["registered", "not_registered", "not_sure"]),
      registeredLegalName: nullableTextSchema,
      registrationNumber: nullableTextSchema,
      entityType: z
        .enum(["business_name", "local_company", "foreign_company", "other"])
        .nullable(),
    })
    .nullable(),
  contactVerified: z.boolean(),
  approvalReadiness: z.object({
    ready: z.boolean(),
    missing: z.array(
      z.enum(["linked_owner", "verified_contact", "ownership_application"]),
    ),
  }),
  latestReview: z
    .object({
      decision: businessReviewDecisionSchema,
      reason: nullableTextSchema,
      createdAt: z.string().datetime(),
    })
    .nullable(),
});

export const adminBusinessReviewQueueSchema = z.object({
  viewerRole: z.enum(["admin", "reviewer"]),
  businesses: z.array(adminBusinessReviewItemSchema),
});

export type AdminBusinessReviewQueue = z.infer<
  typeof adminBusinessReviewQueueSchema
>;

export const submittedBusinessReviewSchema = z.object({
  businessId: z.string().uuid(),
  businessStatus: z.enum(["draft", "active", "suspended", "closed"]),
  reviewStatus: businessReviewStatusSchema,
  reviewedAt: z.string().datetime(),
});

export type SubmittedBusinessReview = z.infer<
  typeof submittedBusinessReviewSchema
>;
