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
  businessLocations,
  businessResponses,
  businesses,
  businessServices,
  categories,
  customerRequests,
  districts,
  eq,
  interactions,
  or,
  requestMatches,
} from '@zed360/database';
import { DatabaseService } from './database.service';

@Injectable()
export class RequestsService {
  constructor(private readonly database: DatabaseService) {}

  async create(request: CreateCustomerRequest) {
    const [[category], [district]] = await Promise.all([
      this.database.db
        .select({ id: categories.id })
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
        })
        .from(businessServices)
        .innerJoin(
          businessLocations,
          eq(businessLocations.businessId, businessServices.businessId),
        )
        .innerJoin(businesses, eq(businesses.id, businessServices.businessId))
        .where(
          and(
            eq(businessServices.categoryId, request.categoryId),
            eq(businessServices.isAvailable, true),
            eq(businessLocations.districtId, request.districtId),
            eq(businessLocations.isActive, true),
            or(eq(businesses.status, 'draft'), eq(businesses.status, 'active')),
          ),
        )
        .groupBy(businesses.id, businesses.status);

      if (candidates.length > 0) {
        await transaction
          .insert(requestMatches)
          .values(
            candidates.map((candidate) => ({
              requestId: customerRequest.id,
              businessId: candidate.businessId,
              status: 'queued' as const,
              score: candidate.businessStatus === 'active' ? '1.000' : '0.800',
              reasons: [
                'category_exact',
                'district_exact',
                candidate.businessStatus === 'active'
                  ? 'business_active'
                  : 'business_pending_review',
              ],
            })),
          )
          .onConflictDoNothing();
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
      }
    });

    return this.getSharedRequest(shareToken);
  }
}
