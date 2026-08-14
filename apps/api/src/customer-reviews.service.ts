import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminCustomerReviewQueue,
  SubmitCustomerReview,
  SubmitCustomerReviewDecision,
} from '@zed360/contracts';
import {
  and,
  asc,
  businesses,
  customerRequests,
  eq,
  interactions,
  reviews,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

export function reviewModeration(body: string | undefined): {
  status: 'approved' | 'pending';
  note: string | null;
} {
  if (!body) return { status: 'approved', note: null };
  const flags = [
    /https?:\/\/|www\./i.test(body) ? 'external link' : null,
    /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i.test(body) ? 'email address' : null,
    /(?:\+?\d[\s().-]?){9,}/.test(body) ? 'phone number' : null,
    /(.)\1{7,}/i.test(body) ? 'repeated characters' : null,
  ].filter((flag): flag is string => Boolean(flag));
  return flags.length
    ? {
        status: 'pending',
        note: `Automatically flagged for review: ${flags.join(', ')}.`,
      }
    : { status: 'approved', note: null };
}

@Injectable()
export class CustomerReviewsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
  ) {}

  async submit(shareToken: string, review: SubmitCustomerReview) {
    const [eligibleInteraction] = await this.database.db
      .select({
        id: interactions.id,
        businessId: interactions.businessId,
        requestStatus: customerRequests.status,
        outcomeConfirmed: interactions.outcomeConfirmed,
      })
      .from(customerRequests)
      .innerJoin(interactions, eq(interactions.requestId, customerRequests.id))
      .where(
        and(
          eq(customerRequests.shareToken, shareToken),
          eq(interactions.outcomeConfirmed, true),
        ),
      )
      .limit(1);

    if (!eligibleInteraction) {
      throw new NotFoundException(
        'Choose a business on this completed request before reviewing it.',
      );
    }
    if (eligibleInteraction.requestStatus !== 'resolved') {
      throw new ConflictException(
        'Complete the request before reviewing the selected business.',
      );
    }

    const now = new Date();
    const moderation = reviewModeration(review.body);
    const [saved] = await this.database.db
      .insert(reviews)
      .values({
        interactionId: eligibleInteraction.id,
        businessId: eligibleInteraction.businessId,
        rating: review.rating,
        body: review.body || null,
        moderationStatus: moderation.status,
        moderationNote: moderation.note,
        reviewedAt: null,
        isPublished: moderation.status === 'approved',
      })
      .onConflictDoUpdate({
        target: reviews.interactionId,
        set: {
          rating: review.rating,
          body: review.body || null,
          moderationStatus: moderation.status,
          moderationNote: moderation.note,
          reviewedByUserId: null,
          reviewedAt: null,
          isPublished: moderation.status === 'approved',
          updatedAt: now,
        },
      })
      .returning();

    if (!saved) throw new Error('The review could not be saved.');
    return this.toCustomerReview(saved);
  }

  async list(user: AuthenticatedUser): Promise<AdminCustomerReviewQueue> {
    const viewerRole = await this.authorization.requireReviewer(user);
    const rows = await this.database.db
      .select({ review: reviews, business: businesses })
      .from(reviews)
      .innerJoin(businesses, eq(reviews.businessId, businesses.id))
      .where(eq(reviews.moderationStatus, 'pending'))
      .orderBy(asc(reviews.createdAt));

    return {
      viewerRole,
      reviews: rows.map(({ review, business }) => ({
        ...this.toCustomerReview(review),
        business: { id: business.id, name: business.name },
      })),
    };
  }

  async decide(
    user: AuthenticatedUser,
    reviewId: string,
    decision: SubmitCustomerReviewDecision,
  ): Promise<AdminCustomerReviewQueue> {
    await this.authorization.requireReviewer(user);
    const [review] = await this.database.db
      .select({ id: reviews.id, moderationStatus: reviews.moderationStatus })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);
    if (!review) throw new NotFoundException('Customer review not found.');
    if (review.moderationStatus !== 'pending') {
      throw new ConflictException('This customer review was already reviewed.');
    }

    const now = new Date();
    await this.database.db
      .update(reviews)
      .set({
        moderationStatus: decision.decision,
        moderationNote: decision.note || null,
        reviewedByUserId: user.id,
        reviewedAt: now,
        isPublished: decision.decision === 'approved',
        updatedAt: now,
      })
      .where(eq(reviews.id, reviewId));

    return this.list(user);
  }

  private toCustomerReview(review: typeof reviews.$inferSelect) {
    return {
      id: review.id,
      rating: review.rating,
      body: review.body,
      moderationStatus: review.moderationStatus,
      moderationNote: review.moderationNote,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }
}
