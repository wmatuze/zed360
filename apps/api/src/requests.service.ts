import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateCustomerRequest,
  CustomerRequestOutcomeAction,
  SharedCustomerRequest,
} from '@zed360/contracts';
import {
  and,
  businessMembers,
  businessNotificationEvents,
  businessNotifications,
  businessResponses,
  businesses,
  businessServices,
  categories,
  customerRequests,
  districts,
  eq,
  interactions,
  inArray,
  or,
  requestMatches,
  reviews,
  sql,
} from '@zed360/database';
import { DatabaseService } from './database.service';

@Injectable()
export class RequestsService {
  constructor(private readonly database: DatabaseService) {}

  async create(request: CreateCustomerRequest) {
    const [[category], [district]] = await Promise.all([
      this.database.db
        .select({ id: categories.id, parentId: categories.parentId })
        .from(categories)
        .where(
          and(
            eq(categories.id, request.categoryId),
            eq(categories.isActive, true),
          ),
        )
        .limit(1),
      this.database.db
        .select({ id: districts.id })
        .from(districts)
        .where(eq(districts.id, request.districtId))
        .limit(1),
    ]);

    if (!category) {
      throw new NotFoundException('The selected category is unavailable.');
    }
    if (!district) {
      throw new NotFoundException('The selected district is unavailable.');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const created = await this.database.db.transaction(async (transaction) => {
      const [customerRequest] = await transaction
        .insert(customerRequests)
        .values({
          categoryId: request.categoryId,
          districtId: request.districtId,
          status: 'open',
          summary: request.summary,
          details: request.details,
          answers: {
            timing: request.timing,
            categoryAnswers: request.categoryAnswers,
          },
          neededAt:
            request.timing === 'specific_date' ? request.neededAt : undefined,
          budgetMinimum: request.budgetMinimum?.toFixed(2),
          budgetMaximum: request.budgetMaximum?.toFixed(2),
          expiresAt,
        })
        .returning({
          id: customerRequests.id,
          shareToken: customerRequests.shareToken,
          status: customerRequests.status,
          createdAt: customerRequests.createdAt,
        });

      if (!customerRequest) {
        throw new Error('The request could not be created.');
      }

      const candidates = await transaction
        .select({
          businessId: businesses.id,
          businessStatus: businesses.status,
          businessReviewStatus: businesses.reviewStatus,
        })
        .from(businessServices)
        .innerJoin(businesses, eq(businesses.id, businessServices.businessId))
        .where(
          and(
            or(
              eq(businessServices.categoryId, request.categoryId),
              category.parentId
                ? eq(businessServices.categoryId, category.parentId)
                : undefined,
              sql`exists (
                select 1 from categories match_service_category
                where match_service_category.id = ${businessServices.categoryId}
                  and match_service_category.parent_id = ${request.categoryId}
              )`,
            ),
            eq(businessServices.isAvailable, true),
            or(eq(businesses.status, 'draft'), eq(businesses.status, 'active')),
            sql`(
              exists (
                select 1 from business_locations match_location
                where match_location.business_id = ${businesses.id}
                  and match_location.district_id = ${request.districtId}
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
                    or match_area.district_id = ${request.districtId}
                    or match_area.province_id = (
                      select match_district.province_id
                      from districts match_district
                      where match_district.id = ${request.districtId}
                    )
                  )
              )
            )`,
          ),
        )
        .groupBy(businesses.id, businesses.status, businesses.reviewStatus);

      if (candidates.length > 0) {
        const matches = await transaction
          .insert(requestMatches)
          .values(
            candidates.map((candidate) => ({
              requestId: customerRequest.id,
              businessId: candidate.businessId,
              status: 'queued' as const,
              score: candidate.businessStatus === 'active' ? '1.000' : '0.800',
              reasons: [
                'category_exact',
                'service_area_match',
                candidate.businessStatus === 'active'
                  ? 'business_active'
                  : 'business_pending_review',
              ],
            })),
          )
          .onConflictDoNothing()
          .returning({
            id: requestMatches.id,
            businessId: requestMatches.businessId,
          });

        const notifiableBusinessIds = new Set(
          candidates
            .filter(
              (candidate) =>
                candidate.businessStatus === 'active' &&
                candidate.businessReviewStatus === 'approved',
            )
            .map((candidate) => candidate.businessId),
        );
        const notifiableMatches = matches.filter((match) =>
          notifiableBusinessIds.has(match.businessId),
        );
        if (notifiableMatches.length) {
          const events = await transaction
            .insert(businessNotificationEvents)
            .values(
              notifiableMatches.map((match) => ({
                businessId: match.businessId,
                type: 'request_matched' as const,
                title: 'New matched request',
                body: request.summary,
                actionUrl: '/business/requests',
                eventKey: `request-match:${match.id}`,
                data: { requestId: customerRequest.id, matchId: match.id },
              })),
            )
            .onConflictDoNothing()
            .returning({
              id: businessNotificationEvents.id,
              businessId: businessNotificationEvents.businessId,
            });
          if (events.length) {
            const recipients = await transaction
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
                  inArray(businessMembers.role, ['owner', 'manager']),
                ),
              );
            const notifications = events.flatMap((event) =>
              recipients
                .filter(
                  (recipient) => recipient.businessId === event.businessId,
                )
                .map((recipient) => ({
                  eventId: event.id,
                  recipientUserId: recipient.userId,
                })),
            );
            if (notifications.length) {
              await transaction
                .insert(businessNotifications)
                .values(notifications)
                .onConflictDoNothing();
            }
          }
        }
      }

      return customerRequest;
    });

    if (!created) {
      throw new Error('The request could not be created.');
    }

    return {
      ...created,
      status: 'open' as const,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async getSharedRequest(shareToken: string): Promise<SharedCustomerRequest> {
    const [request] = await this.database.db
      .select({
        id: customerRequests.id,
        summary: customerRequests.summary,
        details: customerRequests.details,
        status: customerRequests.status,
        answers: customerRequests.answers,
        categoryName: categories.name,
        districtName: districts.name,
        neededAt: customerRequests.neededAt,
        budgetMinimum: customerRequests.budgetMinimum,
        budgetMaximum: customerRequests.budgetMaximum,
        createdAt: customerRequests.createdAt,
        expiresAt: customerRequests.expiresAt,
      })
      .from(customerRequests)
      .innerJoin(categories, eq(customerRequests.categoryId, categories.id))
      .leftJoin(districts, eq(customerRequests.districtId, districts.id))
      .where(eq(customerRequests.shareToken, shareToken))
      .limit(1);

    if (!request || request.status === 'draft') {
      throw new NotFoundException('This private request link is unavailable.');
    }

    const responseRows = await this.database.db
      .select({
        matchId: requestMatches.id,
        status: businessResponses.status,
        message: businessResponses.message,
        priceMinimum: businessResponses.priceMinimum,
        priceMaximum: businessResponses.priceMaximum,
        updatedAt: businessResponses.updatedAt,
        businessId: businesses.id,
        businessName: businesses.name,
        businessDescription: businesses.description,
        phone: businesses.phone,
        whatsapp: businesses.whatsapp,
        email: businesses.email,
        website: businesses.website,
      })
      .from(requestMatches)
      .innerJoin(
        businessResponses,
        eq(businessResponses.matchId, requestMatches.id),
      )
      .innerJoin(businesses, eq(requestMatches.businessId, businesses.id))
      .where(
        and(
          eq(requestMatches.requestId, request.id),
          eq(requestMatches.status, 'responded'),
          eq(businesses.status, 'active'),
          eq(businesses.reviewStatus, 'approved'),
        ),
      );

    const interactionRows = await this.database.db
      .select({
        businessId: interactions.businessId,
        outcomeConfirmed: interactions.outcomeConfirmed,
      })
      .from(interactions)
      .where(eq(interactions.requestId, request.id));

    const [review] = await this.database.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        body: reviews.body,
        moderationStatus: reviews.moderationStatus,
        moderationNote: reviews.moderationNote,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(interactions, eq(reviews.interactionId, interactions.id))
      .where(
        and(
          eq(interactions.requestId, request.id),
          eq(interactions.outcomeConfirmed, true),
        ),
      )
      .limit(1);

    const timing = request.answers.timing;
    const validTiming =
      timing === 'as_soon_as_possible' ||
      timing === 'today' ||
      timing === 'this_week' ||
      timing === 'specific_date' ||
      timing === 'flexible'
        ? timing
        : null;
    const optionalNumber = (value: string | null) =>
      value === null ? null : Number(value);

    return {
      request: {
        id: request.id,
        summary: request.summary,
        details: request.details,
        status: request.status,
        categoryName: request.categoryName,
        districtName: request.districtName,
        timing: validTiming,
        neededAt: request.neededAt?.toISOString() ?? null,
        budgetMinimum: optionalNumber(request.budgetMinimum),
        budgetMaximum: optionalNumber(request.budgetMaximum),
        createdAt: request.createdAt.toISOString(),
        expiresAt: request.expiresAt?.toISOString() ?? null,
      },
      responses: responseRows
        .filter((response) => response.message !== null)
        .map((response) => ({
          matchId: response.matchId,
          status: response.status,
          message: response.message!,
          priceMinimum: optionalNumber(response.priceMinimum),
          priceMaximum: optionalNumber(response.priceMaximum),
          updatedAt: response.updatedAt.toISOString(),
          business: {
            id: response.businessId,
            name: response.businessName,
            description: response.businessDescription,
            phone: response.phone,
            whatsapp: response.whatsapp,
            email: response.email,
            website: response.website,
          },
        })),
      outcome: {
        contactedBusinessIds: interactionRows.map(
          (interaction) => interaction.businessId,
        ),
        selectedBusinessId:
          interactionRows.find((interaction) => interaction.outcomeConfirmed)
            ?.businessId ?? null,
      },
      review: review
        ? {
            ...review,
            createdAt: review.createdAt.toISOString(),
            updatedAt: review.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async recordOutcome(
    shareToken: string,
    action: CustomerRequestOutcomeAction,
  ): Promise<SharedCustomerRequest> {
    await this.database.db.transaction(async (transaction) => {
      const [request] = await transaction
        .select({
          id: customerRequests.id,
          status: customerRequests.status,
          expiresAt: customerRequests.expiresAt,
        })
        .from(customerRequests)
        .where(eq(customerRequests.shareToken, shareToken))
        .limit(1);

      if (!request || request.status === 'draft') {
        throw new NotFoundException(
          'This private request link is unavailable.',
        );
      }

      if (
        request.status === 'expired' ||
        (request.expiresAt !== null && request.expiresAt < new Date())
      ) {
        throw new ConflictException('This request has expired.');
      }

      if (action.action === 'reopened') {
        if (request.status !== 'resolved' && request.status !== 'cancelled') {
          throw new ConflictException('This request is already open.');
        }
        await transaction
          .update(interactions)
          .set({ outcomeConfirmed: false, resolvedAt: null })
          .where(eq(interactions.requestId, request.id));
        await transaction
          .update(customerRequests)
          .set({ status: 'open', updatedAt: new Date() })
          .where(eq(customerRequests.id, request.id));
        return;
      }

      if (action.action === 'closed_without_choice') {
        if (request.status !== 'open' && request.status !== 'matched') {
          throw new ConflictException('This request is already closed.');
        }
        await transaction
          .update(interactions)
          .set({ outcomeConfirmed: false, resolvedAt: null })
          .where(eq(interactions.requestId, request.id));
        await transaction
          .update(customerRequests)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(customerRequests.id, request.id));
        return;
      }

      if (
        request.status !== 'open' &&
        request.status !== 'matched' &&
        !(action.action === 'chosen' && request.status === 'resolved')
      ) {
        throw new ConflictException(
          'Reopen this request before recording another outcome.',
        );
      }

      const [eligibleResponse] = await transaction
        .select({
          businessId: businesses.id,
          responseStatus: businessResponses.status,
        })
        .from(requestMatches)
        .innerJoin(
          businessResponses,
          eq(businessResponses.matchId, requestMatches.id),
        )
        .innerJoin(businesses, eq(businesses.id, requestMatches.businessId))
        .where(
          and(
            eq(requestMatches.id, action.matchId),
            eq(requestMatches.requestId, request.id),
            eq(requestMatches.status, 'responded'),
            eq(businesses.status, 'active'),
            eq(businesses.reviewStatus, 'approved'),
          ),
        )
        .limit(1);

      if (
        !eligibleResponse ||
        eligibleResponse.responseStatus === 'unavailable'
      ) {
        throw new ConflictException(
          'That business response is no longer available for this request.',
        );
      }

      const now = new Date();
      if (action.action === 'chosen') {
        await transaction
          .update(interactions)
          .set({ outcomeConfirmed: false, resolvedAt: null })
          .where(eq(interactions.requestId, request.id));
      }

      await transaction
        .insert(interactions)
        .values({
          requestId: request.id,
          businessId: eligibleResponse.businessId,
          contactedAt: now,
          resolvedAt: action.action === 'chosen' ? now : null,
          outcomeConfirmed: action.action === 'chosen',
        })
        .onConflictDoUpdate({
          target: [interactions.requestId, interactions.businessId],
          set: {
            contactedAt: now,
            resolvedAt: action.action === 'chosen' ? now : null,
            outcomeConfirmed: action.action === 'chosen',
          },
        });

      if (action.action === 'chosen') {
        await transaction
          .update(customerRequests)
          .set({ status: 'resolved', updatedAt: now })
          .where(eq(customerRequests.id, request.id));
        const [event] = await transaction
          .insert(businessNotificationEvents)
          .values({
            businessId: eligibleResponse.businessId,
            type: 'customer_selected',
            title: 'A customer selected your business',
            body: 'Your response was selected for a customer request.',
            actionUrl: '/business/notifications',
            eventKey: `customer-selected:${request.id}:${eligibleResponse.businessId}`,
            data: { requestId: request.id },
          })
          .onConflictDoNothing()
          .returning({ id: businessNotificationEvents.id });
        if (event) {
          const recipients = await transaction
            .select({ userId: businessMembers.userId })
            .from(businessMembers)
            .where(
              and(
                eq(businessMembers.businessId, eligibleResponse.businessId),
                inArray(businessMembers.role, ['owner', 'manager']),
              ),
            );
          if (recipients.length) {
            await transaction
              .insert(businessNotifications)
              .values(
                recipients.map((recipient) => ({
                  eventId: event.id,
                  recipientUserId: recipient.userId,
                })),
              )
              .onConflictDoNothing();
          }
        }
      }
    });

    return this.getSharedRequest(shareToken);
  }
}
