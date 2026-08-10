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
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    website: z.string().trim().url().max(500).optional().or(z.literal("")),
    registrationStatus: businessRegistrationStatusSchema,
    registeredLegalName: z.string().trim().max(160).optional(),
    registrationNumber: z.string().trim().max(80).optional(),
    entityType: businessEntityTypeSchema.optional(),
    representativeConfirmed: z.literal(true),
  })
  .refine(({ phone, whatsapp, email }) => phone || whatsapp || email, {
    message: "Provide at least one phone number, WhatsApp number, or email",
    path: ["phone"],
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
});

export type CreatedBusinessApplication = z.infer<
  typeof createdBusinessApplicationSchema
>;

export const claimBusinessSchema = z.object({
  businessId: z.string().uuid(),
});

export type ClaimBusiness = z.infer<typeof claimBusinessSchema>;

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
});

export type SharedCustomerRequest = z.infer<typeof sharedCustomerRequestSchema>;

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
