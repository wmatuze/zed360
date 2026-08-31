import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { BusinessAccount } from '@zed360/contracts';
import {
  and,
  asc,
  businessMembers,
  businessReviews,
  businesses,
  businessVerifications,
  desc,
  eq,
  inArray,
  sql,
  users,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { createHash } from 'node:crypto';

function isPostgresError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

function hashClaimToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class BusinessAccountsService {
  constructor(private readonly database: DatabaseService) {}

  async getAccount(user: AuthenticatedUser): Promise<BusinessAccount> {
    await this.syncUser(user);

    const ownedBusinesses = await this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
        status: businesses.status,
        reviewStatus: businesses.reviewStatus,
        role: businessMembers.role,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
      .where(eq(businessMembers.userId, user.id))
      .orderBy(asc(businesses.name));

    const latestReviewReasons = new Map<string, string | null>();
    if (ownedBusinesses.length > 0) {
      const reviewRows = await this.database.db
        .select({
          businessId: businessReviews.businessId,
          reason: businessReviews.reason,
        })
        .from(businessReviews)
        .where(
          inArray(
            businessReviews.businessId,
            ownedBusinesses.map(({ id }) => id),
          ),
        )
        .orderBy(desc(businessReviews.createdAt));
      for (const review of reviewRows) {
        if (!latestReviewReasons.has(review.businessId)) {
          latestReviewReasons.set(review.businessId, review.reason);
        }
      }
    }

    const matchingDrafts = await this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .where(
        and(
          eq(businesses.status, 'draft'),
          sql`lower(${businesses.email}) = ${user.email}`,
        ),
      )
      .orderBy(asc(businesses.createdAt));

    const ownerRows =
      matchingDrafts.length === 0
        ? []
        : await this.database.db
            .select({ businessId: businessMembers.businessId })
            .from(businessMembers)
            .where(
              and(
                eq(businessMembers.role, 'owner'),
                inArray(
                  businessMembers.businessId,
                  matchingDrafts.map((business) => business.id),
                ),
              ),
            );
    const claimedIds = new Set(ownerRows.map((row) => row.businessId));

    return {
      businesses: ownedBusinesses.map((business) => ({
        ...business,
        latestReviewReason: latestReviewReasons.get(business.id) ?? null,
      })),
      claimableBusinesses: matchingDrafts
        .filter((business) => !claimedIds.has(business.id))
        .map((business) => ({
          ...business,
          createdAt: business.createdAt.toISOString(),
        })),
    };
  }

  async claimBusiness(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessAccount> {
    await this.syncUser(user);

    try {
      await this.database.db.transaction(async (transaction) => {
        const [business] = await transaction
          .select({ id: businesses.id })
          .from(businesses)
          .where(
            and(
              eq(businesses.id, businessId),
              eq(businesses.status, 'draft'),
              sql`lower(${businesses.email}) = ${user.email}`,
            ),
          )
          .limit(1);

        if (!business) {
          throw new NotFoundException(
            'This submitted business cannot be linked to your account.',
          );
        }

        const [currentOwner] = await transaction
          .select({ userId: businessMembers.userId })
          .from(businessMembers)
          .where(
            and(
              eq(businessMembers.businessId, businessId),
              eq(businessMembers.role, 'owner'),
            ),
          )
          .limit(1);

        if (currentOwner && currentOwner.userId !== user.id) {
          throw new ConflictException(
            'This business has already been linked to another owner.',
          );
        }

        await transaction
          .insert(businessMembers)
          .values({ businessId, userId: user.id, role: 'owner' })
          .onConflictDoUpdate({
            target: [businessMembers.businessId, businessMembers.userId],
            set: { role: 'owner' },
          });

        const [verifiedContact] = await transaction
          .select({ id: businessVerifications.id })
          .from(businessVerifications)
          .where(
            and(
              eq(businessVerifications.businessId, businessId),
              eq(businessVerifications.type, 'contact'),
              eq(businessVerifications.status, 'verified'),
            ),
          )
          .limit(1);

        if (!verifiedContact) {
          await transaction.insert(businessVerifications).values({
            businessId,
            type: 'contact',
            status: 'verified',
            evidence: {
              source: 'supabase_magic_link',
              method: 'email',
              verifiedAt: user.emailVerifiedAt.toISOString(),
            },
          });
        }
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (isPostgresError(error) && error.code === '23505') {
        throw new ConflictException(
          'This business has already been linked to another owner.',
        );
      }
      throw error;
    }

    return this.getAccount(user);
  }

  async previewApplicationClaim(user: AuthenticatedUser, token: string) {
    await this.syncUser(user);
    const tokenHash = hashClaimToken(token);
    const [application] = await this.database.db
      .select({
        businessId: businesses.id,
        businessName: businesses.name,
        submittedEmail: businesses.email,
        ownerUserId: businessMembers.userId,
      })
      .from(businessVerifications)
      .innerJoin(
        businesses,
        eq(businessVerifications.businessId, businesses.id),
      )
      .leftJoin(
        businessMembers,
        and(
          eq(businessMembers.businessId, businesses.id),
          eq(businessMembers.role, 'owner'),
        ),
      )
      .where(
        and(
          eq(businessVerifications.type, 'ownership'),
          sql`${businessVerifications.evidence}->>'claimTokenHash' = ${tokenHash}`,
        ),
      )
      .limit(1);

    if (
      !application?.submittedEmail ||
      application.submittedEmail.trim().toLowerCase() !== user.email
    ) {
      throw new NotFoundException(
        'This application link is invalid or unavailable.',
      );
    }
    if (application.ownerUserId && application.ownerUserId !== user.id) {
      throw new ConflictException(
        'This application is already connected to another account.',
      );
    }

    return {
      businessId: application.businessId,
      businessName: application.businessName,
      submittedEmail: application.submittedEmail,
      status:
        application.ownerUserId === user.id
          ? ('already_connected' as const)
          : ('ready' as const),
    };
  }

  async confirmApplicationClaim(user: AuthenticatedUser, token: string) {
    await this.syncUser(user);
    const tokenHash = hashClaimToken(token);

    try {
      return await this.database.db.transaction(async (transaction) => {
        const [verification] = await transaction
          .select({
            id: businessVerifications.id,
            businessId: businessVerifications.businessId,
            evidence: businessVerifications.evidence,
          })
          .from(businessVerifications)
          .where(
            and(
              eq(businessVerifications.type, 'ownership'),
              sql`${businessVerifications.evidence}->>'claimTokenHash' = ${tokenHash}`,
            ),
          )
          .limit(1)
          .for('update');
        if (!verification) {
          throw new NotFoundException(
            'This application link is invalid or unavailable.',
          );
        }

        const [business] = await transaction
          .select({
            id: businesses.id,
            name: businesses.name,
            email: businesses.email,
            status: businesses.status,
          })
          .from(businesses)
          .where(eq(businesses.id, verification.businessId))
          .limit(1)
          .for('update');
        if (
          !business?.email ||
          business.email.trim().toLowerCase() !== user.email
        ) {
          throw new NotFoundException(
            'This application link is invalid or unavailable.',
          );
        }

        const [currentOwner] = await transaction
          .select({ userId: businessMembers.userId })
          .from(businessMembers)
          .where(
            and(
              eq(businessMembers.businessId, business.id),
              eq(businessMembers.role, 'owner'),
            ),
          )
          .limit(1);
        if (currentOwner && currentOwner.userId !== user.id) {
          throw new ConflictException(
            'This application is already connected to another account.',
          );
        }
        if (!currentOwner && business.status !== 'draft') {
          throw new ConflictException(
            'This application can no longer be connected automatically.',
          );
        }

        if (!currentOwner) {
          await transaction.insert(businessMembers).values({
            businessId: business.id,
            userId: user.id,
            role: 'owner',
          });
        }

        const [verifiedContact] = await transaction
          .select({ id: businessVerifications.id })
          .from(businessVerifications)
          .where(
            and(
              eq(businessVerifications.businessId, business.id),
              eq(businessVerifications.type, 'contact'),
              eq(businessVerifications.status, 'verified'),
            ),
          )
          .limit(1);
        if (!verifiedContact) {
          await transaction.insert(businessVerifications).values({
            businessId: business.id,
            type: 'contact',
            status: 'verified',
            evidence: {
              source: 'supabase_magic_link',
              method: 'email',
              verifiedAt: user.emailVerifiedAt.toISOString(),
            },
          });
        }

        if (!currentOwner) {
          await transaction
            .update(businessVerifications)
            .set({
              evidence: {
                ...verification.evidence,
                claimedAt: new Date().toISOString(),
                claimedByUserId: user.id,
              },
              updatedAt: new Date(),
            })
            .where(eq(businessVerifications.id, verification.id));
        }

        return {
          businessId: business.id,
          businessName: business.name,
          submittedEmail: business.email,
          status: 'already_connected' as const,
        };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (isPostgresError(error) && error.code === '23505') {
        throw new ConflictException(
          'This application is already connected to another account.',
        );
      }
      throw error;
    }
  }

  private async syncUser(user: AuthenticatedUser) {
    const [emailOwner] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);

    if (emailOwner && emailOwner.id !== user.id) {
      throw new ConflictException(
        'This email is already connected to another Zed360 account.',
      );
    }

    await this.database.db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt,
          updatedAt: new Date(),
        },
      });
  }
}
