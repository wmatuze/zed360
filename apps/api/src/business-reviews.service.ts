import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminBusinessReviewQueue,
  SubmitBusinessReview,
  SubmittedBusinessReview,
} from '@zed360/contracts';
import {
  and,
  businessLocations,
  businessMembers,
  businessReviews,
  businesses,
  businessServices,
  businessVerifications,
  categories,
  desc,
  districts,
  eq,
  inArray,
  provinces,
  users,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

type RegistrationDetails = NonNullable<
  AdminBusinessReviewQueue['businesses'][number]['registration']
>;

type BusinessState = {
  status: 'draft' | 'active' | 'suspended' | 'closed';
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'changes_requested';
};

type ReviewTransition = BusinessState & {
  ownershipStatus: 'verified' | 'rejected' | 'pending' | null;
  requiresApprovalEvidence: boolean;
};

export function resolveReviewTransition(
  current: BusinessState,
  decision: SubmitBusinessReview['decision'],
): ReviewTransition | null {
  if (
    decision === 'approved' &&
    current.status === 'draft' &&
    (current.reviewStatus === 'pending' ||
      current.reviewStatus === 'changes_requested')
  ) {
    return {
      status: 'active',
      reviewStatus: 'approved',
      ownershipStatus: 'verified',
      requiresApprovalEvidence: true,
    };
  }
  if (
    decision === 'changes_requested' &&
    current.status === 'draft' &&
    (current.reviewStatus === 'pending' ||
      current.reviewStatus === 'changes_requested')
  ) {
    return {
      status: 'draft',
      reviewStatus: 'changes_requested',
      ownershipStatus: 'pending',
      requiresApprovalEvidence: false,
    };
  }
  if (
    decision === 'rejected' &&
    current.status === 'draft' &&
    (current.reviewStatus === 'pending' ||
      current.reviewStatus === 'changes_requested')
  ) {
    return {
      status: 'draft',
      reviewStatus: 'rejected',
      ownershipStatus: 'rejected',
      requiresApprovalEvidence: false,
    };
  }
  if (
    decision === 'suspended' &&
    current.status === 'active' &&
    current.reviewStatus === 'approved'
  ) {
    return {
      status: 'suspended',
      reviewStatus: 'approved',
      ownershipStatus: null,
      requiresApprovalEvidence: false,
    };
  }
  if (
    decision === 'approval_revoked' &&
    (current.status === 'active' || current.status === 'suspended') &&
    current.reviewStatus === 'approved'
  ) {
    return {
      status: 'draft',
      reviewStatus: 'rejected',
      ownershipStatus: 'rejected',
      requiresApprovalEvidence: false,
    };
  }
  if (
    decision === 'reopened' &&
    current.status === 'draft' &&
    current.reviewStatus === 'rejected'
  ) {
    return {
      status: 'draft',
      reviewStatus: 'pending',
      ownershipStatus: 'pending',
      requiresApprovalEvidence: false,
    };
  }
  if (
    decision === 'reinstated' &&
    current.status === 'suspended' &&
    current.reviewStatus === 'approved'
  ) {
    return {
      status: 'active',
      reviewStatus: 'approved',
      ownershipStatus: 'verified',
      requiresApprovalEvidence: true,
    };
  }
  return null;
}

function registrationFromEvidence(
  evidence: unknown,
): RegistrationDetails | null {
  const declaration = objectValue(
    objectValue(evidence)?.registrationDeclaration,
  );
  if (!declaration) return null;

  const status = declaration.status;
  if (
    status !== 'registered' &&
    status !== 'not_registered' &&
    status !== 'not_sure'
  ) {
    return null;
  }

  const entityType = declaration.entityType;
  return {
    status,
    registeredLegalName: nullableString(declaration.registeredLegalName),
    registrationNumber: nullableString(declaration.registrationNumber),
    entityType:
      entityType === 'business_name' ||
      entityType === 'local_company' ||
      entityType === 'foreign_company' ||
      entityType === 'other'
        ? entityType
        : null,
  };
}

@Injectable()
export class BusinessReviewsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
  ) {}

  async list(user: AuthenticatedUser): Promise<AdminBusinessReviewQueue> {
    const viewerRole = await this.authorization.requireReviewer(user);
    const submissions = await this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
        description: businesses.description,
        status: businesses.status,
        reviewStatus: businesses.reviewStatus,
        email: businesses.email,
        phone: businesses.phone,
        whatsapp: businesses.whatsapp,
        website: businesses.website,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .orderBy(desc(businesses.createdAt))
      .limit(100);

    if (submissions.length === 0) {
      return { viewerRole, businesses: [] };
    }

    const businessIds = submissions.map(({ id }) => id);
    const [serviceRows, locationRows, ownerRows, verificationRows, reviewRows] =
      await Promise.all([
        this.database.db
          .select({
            businessId: businessServices.businessId,
            name: businessServices.name,
            categoryName: categories.name,
          })
          .from(businessServices)
          .innerJoin(categories, eq(businessServices.categoryId, categories.id))
          .where(inArray(businessServices.businessId, businessIds)),
        this.database.db
          .select({
            businessId: businessLocations.businessId,
            name: businessLocations.name,
            address: businessLocations.address,
            districtName: districts.name,
            provinceName: provinces.name,
          })
          .from(businessLocations)
          .leftJoin(districts, eq(businessLocations.districtId, districts.id))
          .leftJoin(provinces, eq(districts.provinceId, provinces.id))
          .where(inArray(businessLocations.businessId, businessIds)),
        this.database.db
          .select({
            businessId: businessMembers.businessId,
            email: users.email,
          })
          .from(businessMembers)
          .innerJoin(users, eq(businessMembers.userId, users.id))
          .where(
            and(
              eq(businessMembers.role, 'owner'),
              inArray(businessMembers.businessId, businessIds),
            ),
          ),
        this.database.db
          .select({
            businessId: businessVerifications.businessId,
            type: businessVerifications.type,
            status: businessVerifications.status,
            evidence: businessVerifications.evidence,
          })
          .from(businessVerifications)
          .where(inArray(businessVerifications.businessId, businessIds)),
        this.database.db
          .select({
            businessId: businessReviews.businessId,
            decision: businessReviews.decision,
            reason: businessReviews.reason,
            createdAt: businessReviews.createdAt,
          })
          .from(businessReviews)
          .where(inArray(businessReviews.businessId, businessIds))
          .orderBy(desc(businessReviews.createdAt)),
      ]);

    return {
      viewerRole,
      businesses: submissions.map((business) => {
        const verifications = verificationRows.filter(
          (row) => row.businessId === business.id,
        );
        const ownershipEvidence = verifications.find(
          ({ type }) => type === 'ownership',
        )?.evidence;
        const latestReview = reviewRows.find(
          (row) => row.businessId === business.id,
        );

        return {
          id: business.id,
          name: business.name,
          description: business.description,
          status: business.status,
          reviewStatus: business.reviewStatus,
          createdAt: business.createdAt.toISOString(),
          contact: {
            email: business.email,
            phone: business.phone,
            whatsapp: business.whatsapp,
            website: business.website,
          },
          ownerEmail:
            ownerRows.find((row) => row.businessId === business.id)?.email ??
            null,
          services: serviceRows
            .filter((row) => row.businessId === business.id)
            .map(({ name, categoryName }) => ({ name, categoryName })),
          locations: locationRows
            .filter((row) => row.businessId === business.id)
            .map(({ name, address, districtName, provinceName }) => ({
              name,
              address,
              districtName,
              provinceName,
            })),
          registration: registrationFromEvidence(ownershipEvidence),
          contactVerified: verifications.some(
            ({ type, status }) => type === 'contact' && status === 'verified',
          ),
          latestReview: latestReview
            ? {
                decision: latestReview.decision,
                reason: latestReview.reason,
                createdAt: latestReview.createdAt.toISOString(),
              }
            : null,
        };
      }),
    };
  }

  async decide(
    user: AuthenticatedUser,
    businessId: string,
    review: SubmitBusinessReview,
  ): Promise<SubmittedBusinessReview> {
    await this.authorization.requireReviewer(user);
    const reviewedAt = new Date();

    const result = await this.database.db.transaction(async (transaction) => {
      const [business] = await transaction
        .select({
          id: businesses.id,
          status: businesses.status,
          reviewStatus: businesses.reviewStatus,
        })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1)
        .for('update');
      if (!business) throw new NotFoundException('Business not found.');

      const transition = resolveReviewTransition(business, review.decision);
      if (!transition) {
        throw new ConflictException(
          'That review action is not allowed from the business current state.',
        );
      }

      if (transition.requiresApprovalEvidence) {
        const [[owner], [verifiedContact], [ownershipCheck]] =
          await Promise.all([
            transaction
              .select({ userId: businessMembers.userId })
              .from(businessMembers)
              .where(
                and(
                  eq(businessMembers.businessId, businessId),
                  eq(businessMembers.role, 'owner'),
                ),
              )
              .limit(1),
            transaction
              .select({ id: businessVerifications.id })
              .from(businessVerifications)
              .where(
                and(
                  eq(businessVerifications.businessId, businessId),
                  eq(businessVerifications.type, 'contact'),
                  eq(businessVerifications.status, 'verified'),
                ),
              )
              .limit(1),
            transaction
              .select({ id: businessVerifications.id })
              .from(businessVerifications)
              .where(
                and(
                  eq(businessVerifications.businessId, businessId),
                  eq(businessVerifications.type, 'ownership'),
                ),
              )
              .limit(1),
          ]);

        if (!owner || !verifiedContact || !ownershipCheck) {
          throw new ConflictException(
            'Approval requires a linked owner, verified contact, and ownership application.',
          );
        }
      }

      if (transition.ownershipStatus) {
        await transaction
          .update(businessVerifications)
          .set({
            status: transition.ownershipStatus,
            reviewedByUserId: user.id,
            reviewedAt,
            updatedAt: reviewedAt,
          })
          .where(
            and(
              eq(businessVerifications.businessId, businessId),
              eq(businessVerifications.type, 'ownership'),
            ),
          );
      }

      await transaction
        .update(businesses)
        .set({
          status: transition.status,
          reviewStatus: transition.reviewStatus,
          updatedAt: reviewedAt,
        })
        .where(eq(businesses.id, businessId));

      await transaction.insert(businessReviews).values({
        businessId,
        decision: review.decision,
        reason: review.reason || null,
        reviewedByUserId: user.id,
        createdAt: reviewedAt,
      });

      return transition;
    });

    return {
      businessId,
      businessStatus: result.status,
      reviewStatus: result.reviewStatus,
      reviewedAt: reviewedAt.toISOString(),
    };
  }
}
