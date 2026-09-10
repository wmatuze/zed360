import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BusinessCustomerReviews,
  SaveBusinessReviewResponse,
} from '@zed360/contracts';
import {
  and,
  businessMembers,
  businesses,
  desc,
  eq,
  interactions,
  reviewResponses,
  reviews,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

@Injectable()
export class BusinessCustomerReviewsService {
  constructor(private readonly database: DatabaseService) {}

  async get(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessCustomerReviews> {
    const business = await this.requireManager(user, businessId);
    const rows = await this.database.db
      .select({
        reviewId: reviews.id,
        rating: reviews.rating,
        reviewBody: reviews.body,
        reviewCreatedAt: reviews.createdAt,
        responseId: reviewResponses.id,
        responseBody: reviewResponses.body,
        responseCreatedAt: reviewResponses.createdAt,
        responseUpdatedAt: reviewResponses.updatedAt,
      })
      .from(reviews)
      .innerJoin(interactions, eq(reviews.interactionId, interactions.id))
      .leftJoin(
        reviewResponses,
        and(
          eq(reviewResponses.reviewId, reviews.id),
          eq(reviewResponses.isPublished, true),
        ),
      )
      .where(
        and(
          eq(reviews.businessId, businessId),
          eq(reviews.moderationStatus, 'approved'),
          eq(reviews.isPublished, true),
          eq(interactions.outcomeConfirmed, true),
        ),
      )
      .orderBy(desc(reviews.createdAt));

    return {
      business,
      reviews: rows.map((row) => ({
        id: row.reviewId,
        rating: row.rating,
        body: row.reviewBody,
        createdAt: row.reviewCreatedAt.toISOString(),
        response:
          row.responseId &&
          row.responseBody &&
          row.responseCreatedAt &&
          row.responseUpdatedAt
            ? {
                id: row.responseId,
                body: row.responseBody,
                createdAt: row.responseCreatedAt.toISOString(),
                updatedAt: row.responseUpdatedAt.toISOString(),
              }
            : null,
      })),
    };
  }

  async respond(
    user: AuthenticatedUser,
    businessId: string,
    reviewId: string,
    input: SaveBusinessReviewResponse,
  ) {
    await this.requireManager(user, businessId);
    const [review] = await this.database.db
      .select({ id: reviews.id })
      .from(reviews)
      .innerJoin(interactions, eq(reviews.interactionId, interactions.id))
      .where(
        and(
          eq(reviews.id, reviewId),
          eq(reviews.businessId, businessId),
          eq(reviews.moderationStatus, 'approved'),
          eq(reviews.isPublished, true),
          eq(interactions.outcomeConfirmed, true),
        ),
      )
      .limit(1);
    if (!review) {
      throw new NotFoundException('This published review is unavailable.');
    }

    const now = new Date();
    await this.database.db
      .insert(reviewResponses)
      .values({
        reviewId,
        businessId,
        respondedByUserId: user.id,
        body: input.body,
      })
      .onConflictDoUpdate({
        target: reviewResponses.reviewId,
        set: {
          respondedByUserId: user.id,
          body: input.body,
          isPublished: true,
          updatedAt: now,
        },
      });
    return this.get(user, businessId);
  }

  private async requireManager(user: AuthenticatedUser, businessId: string) {
    const [membership] = await this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        role: businessMembers.role,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
      .where(
        and(
          eq(businessMembers.userId, user.id),
          eq(businessMembers.businessId, businessId),
        ),
      )
      .limit(1);
    if (!membership) {
      throw new NotFoundException('This business is unavailable.');
    }
    if (membership.role === 'staff') {
      throw new ForbiddenException(
        'An owner or manager is required to respond to reviews.',
      );
    }
    return {
      id: membership.id,
      name: membership.name,
      slug: membership.slug,
    };
  }
}
