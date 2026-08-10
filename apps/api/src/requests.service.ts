import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateCustomerRequest,
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
    };
  }
}
