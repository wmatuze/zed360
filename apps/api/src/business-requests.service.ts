import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  BusinessRequestHistory,
  MatchedBusinessRequest,
  MatchedBusinessRequests,
  SubmitBusinessResponse,
  SubmittedBusinessResponse,
} from '@zed360/contracts';
import {
  and,
  businessMembers,
  businessResponses,
  businesses,
  categories,
  customerRequests,
  desc,
  districts,
  eq,
  inArray,
  requestMatches,
  sql,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

const visibleRequestStatuses = ['open', 'matched'] as const;
const visibleMatchStatuses = ['queued', 'sent', 'viewed', 'responded'] as const;

function requestTiming(answers: Record<string, unknown>) {
  const timing = answers.timing;
  return timing === 'as_soon_as_possible' ||
    timing === 'today' ||
    timing === 'this_week' ||
    timing === 'specific_date' ||
    timing === 'flexible'
    ? timing
    : null;
}

function optionalNumber(value: string | null) {
  return value === null ? null : Number(value);
}

type BusinessResponseStatus = NonNullable<
  MatchedBusinessRequest['response']
>['status'];

function responseFromRow(row: {
  responseId: string | null;
  responseStatus: BusinessResponseStatus | null;
  responseMessage: string | null;
  responsePriceMinimum: string | null;
  responsePriceMaximum: string | null;
  responseCreatedAt: Date | null;
  responseUpdatedAt: Date | null;
}): MatchedBusinessRequest['response'] {
  if (
    !row.responseId ||
    !row.responseStatus ||
    !row.responseMessage ||
    !row.responseCreatedAt ||
    !row.responseUpdatedAt
  ) {
    return null;
  }

  return {
    id: row.responseId,
    status: row.responseStatus,
    message: row.responseMessage,
    priceMinimum: optionalNumber(row.responsePriceMinimum),
    priceMaximum: optionalNumber(row.responsePriceMaximum),
    createdAt: row.responseCreatedAt.toISOString(),
    updatedAt: row.responseUpdatedAt.toISOString(),
  };
}

export function toMatchedBusinessRequest(row: {
  matchId: string;
  matchStatus: MatchedBusinessRequest['matchStatus'];
  businessId: string;
  businessName: string;
  memberRole: MatchedBusinessRequest['business']['role'];
  requestId: string;
  summary: string;
  details: string | null;
  answers: Record<string, unknown>;
  categoryName: string;
  districtName: string | null;
  neededAt: Date | null;
  budgetMinimum: string | null;
  budgetMaximum: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  responseId: string | null;
  responseStatus: BusinessResponseStatus | null;
  responseMessage: string | null;
  responsePriceMinimum: string | null;
  responsePriceMaximum: string | null;
  responseCreatedAt: Date | null;
  responseUpdatedAt: Date | null;
}): MatchedBusinessRequest {
  return {
    matchId: row.matchId,
    matchStatus: row.matchStatus,
    business: {
      id: row.businessId,
      name: row.businessName,
      role: row.memberRole,
    },
    request: {
      id: row.requestId,
      summary: row.summary,
      details: row.details,
      categoryName: row.categoryName,
      districtName: row.districtName,
      timing: requestTiming(row.answers),
      neededAt: row.neededAt?.toISOString() ?? null,
      budgetMinimum: optionalNumber(row.budgetMinimum),
      budgetMaximum: optionalNumber(row.budgetMaximum),
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
    },
    response: responseFromRow(row),
  };
}

@Injectable()
export class BusinessRequestsService {
  constructor(private readonly database: DatabaseService) {}

  async getMatchedRequests(
    user: AuthenticatedUser,
  ): Promise<MatchedBusinessRequests> {
    const rows = await this.database.db
      .select({
        matchId: requestMatches.id,
        matchStatus: requestMatches.status,
        businessId: businesses.id,
        businessName: businesses.name,
        memberRole: businessMembers.role,
        requestId: customerRequests.id,
        summary: customerRequests.summary,
        details: customerRequests.details,
        answers: customerRequests.answers,
        categoryName: categories.name,
        districtName: districts.name,
        neededAt: customerRequests.neededAt,
        budgetMinimum: customerRequests.budgetMinimum,
        budgetMaximum: customerRequests.budgetMaximum,
        createdAt: customerRequests.createdAt,
        expiresAt: customerRequests.expiresAt,
        responseId: businessResponses.id,
        responseStatus: businessResponses.status,
        responseMessage: businessResponses.message,
        responsePriceMinimum: businessResponses.priceMinimum,
        responsePriceMaximum: businessResponses.priceMaximum,
        responseCreatedAt: businessResponses.createdAt,
        responseUpdatedAt: businessResponses.updatedAt,
      })
      .from(requestMatches)
      .innerJoin(businesses, eq(requestMatches.businessId, businesses.id))
      .innerJoin(businessMembers, eq(businessMembers.businessId, businesses.id))
      .innerJoin(
        customerRequests,
        eq(requestMatches.requestId, customerRequests.id),
      )
      .innerJoin(categories, eq(customerRequests.categoryId, categories.id))
      .leftJoin(districts, eq(customerRequests.districtId, districts.id))
      .leftJoin(
        businessResponses,
        eq(businessResponses.matchId, requestMatches.id),
      )
      .where(
        and(
          eq(businessMembers.userId, user.id),
          eq(businesses.status, 'active'),
          eq(businesses.reviewStatus, 'approved'),
          inArray(customerRequests.status, visibleRequestStatuses),
          inArray(requestMatches.status, visibleMatchStatuses),
          sql`(${customerRequests.expiresAt} is null or ${customerRequests.expiresAt} > now())`,
        ),
      )
      .orderBy(desc(customerRequests.createdAt));

    return { requests: rows.map(toMatchedBusinessRequest) };
  }

  /**
   * Requests that have ended for the signed-in user's businesses. Only the
   * summary already shown while the request was open is returned; customer
   * details and other businesses' responses are never included.
   */
  async getHistory(user: AuthenticatedUser): Promise<BusinessRequestHistory> {
    const rows = await this.database.client`
      select matched.id as "matchId",
             business.name as "businessName",
             request.summary,
             category.name as "categoryName",
             district.name as "districtName",
             request.created_at as "createdAt",
             case
               when exists (select 1 from interactions chosen
                 where chosen.request_id = request.id
                   and chosen.business_id = business.id
                   and chosen.outcome_confirmed = true) then 'chosen'
               when exists (select 1 from interactions other
                 where other.request_id = request.id
                   and other.outcome_confirmed = true) then 'another_chosen'
               when request.status = 'expired'
                 or (request.expires_at is not null and request.expires_at <= now())
                 or matched.status = 'expired' then 'expired'
               else 'closed'
             end as outcome,
             response.status as "responseStatus",
             response.price_minimum as "priceMinimum",
             response.price_maximum as "priceMaximum",
             response.created_at as "respondedAt"
      from request_matches matched
      inner join businesses business on business.id = matched.business_id
      inner join business_members membership
        on membership.business_id = business.id
      inner join customer_requests request on request.id = matched.request_id
      inner join categories category on category.id = request.category_id
      left join districts district on district.id = request.district_id
      left join business_responses response on response.match_id = matched.id
      where membership.user_id = ${user.id}
        and business.status = 'active'
        and business.review_status = 'approved'
        and request.status <> 'draft'
        and not (
          request.status in ('open', 'matched')
          and matched.status in ('queued', 'sent', 'viewed', 'responded')
          and (request.expires_at is null or request.expires_at > now())
        )
      order by request.created_at desc
      limit 100
    `;
    const iso = (value: unknown) =>
      new Date(value as string | Date).toISOString();
    const money = (value: unknown) => (value === null ? null : Number(value));
    const requests = rows.map((row) => ({
      matchId: String(row.matchId),
      businessName: String(row.businessName),
      summary: String(row.summary),
      categoryName: String(row.categoryName),
      districtName:
        typeof row.districtName === 'string' ? row.districtName : null,
      createdAt: iso(row.createdAt),
      outcome:
        row.outcome as BusinessRequestHistory['requests'][number]['outcome'],
      response: row.responseStatus
        ? {
            status: row.responseStatus as NonNullable<
              BusinessRequestHistory['requests'][number]['response']
            >['status'],
            priceMinimum: money(row.priceMinimum),
            priceMaximum: money(row.priceMaximum),
            createdAt: iso(row.respondedAt),
          }
        : null,
    }));
    return {
      requests,
      totals: {
        received: requests.length,
        answered: requests.filter(({ response }) => response).length,
        chosen: requests.filter(({ outcome }) => outcome === 'chosen').length,
      },
    };
  }

  async submitResponse(
    user: AuthenticatedUser,
    matchId: string,
    response: SubmitBusinessResponse,
  ): Promise<SubmittedBusinessResponse> {
    return this.database.db.transaction(async (transaction) => {
      const [authorizedMatch] = await transaction
        .select({ id: requestMatches.id })
        .from(requestMatches)
        .innerJoin(businesses, eq(requestMatches.businessId, businesses.id))
        .innerJoin(
          businessMembers,
          eq(businessMembers.businessId, businesses.id),
        )
        .innerJoin(
          customerRequests,
          eq(requestMatches.requestId, customerRequests.id),
        )
        .where(
          and(
            eq(requestMatches.id, matchId),
            eq(businessMembers.userId, user.id),
            inArray(businessMembers.role, ['owner', 'manager']),
            eq(businesses.status, 'active'),
            eq(businesses.reviewStatus, 'approved'),
            inArray(customerRequests.status, visibleRequestStatuses),
            inArray(requestMatches.status, visibleMatchStatuses),
            sql`(${customerRequests.expiresAt} is null or ${customerRequests.expiresAt} > now())`,
          ),
        )
        .limit(1);

      if (!authorizedMatch) {
        throw new NotFoundException(
          'This matched request is unavailable for your business.',
        );
      }

      const now = new Date();
      const [savedResponse] = await transaction
        .insert(businessResponses)
        .values({
          matchId,
          respondedByUserId: user.id,
          status: response.status,
          message: response.message,
          priceMinimum: response.priceMinimum?.toFixed(2),
          priceMaximum: response.priceMaximum?.toFixed(2),
        })
        .onConflictDoUpdate({
          target: businessResponses.matchId,
          set: {
            respondedByUserId: user.id,
            status: response.status,
            message: response.message,
            priceMinimum: response.priceMinimum?.toFixed(2) ?? null,
            priceMaximum: response.priceMaximum?.toFixed(2) ?? null,
            updatedAt: now,
          },
        })
        .returning({
          id: businessResponses.id,
          status: businessResponses.status,
          message: businessResponses.message,
          priceMinimum: businessResponses.priceMinimum,
          priceMaximum: businessResponses.priceMaximum,
          createdAt: businessResponses.createdAt,
          updatedAt: businessResponses.updatedAt,
        });

      if (!savedResponse || !savedResponse.message) {
        throw new Error('The business response could not be saved.');
      }

      await transaction
        .update(requestMatches)
        .set({ status: 'responded', updatedAt: now })
        .where(eq(requestMatches.id, matchId));

      return {
        matchId,
        response: {
          id: savedResponse.id,
          status: savedResponse.status,
          message: savedResponse.message,
          priceMinimum: optionalNumber(savedResponse.priceMinimum),
          priceMaximum: optionalNumber(savedResponse.priceMaximum),
          createdAt: savedResponse.createdAt.toISOString(),
          updatedAt: savedResponse.updatedAt.toISOString(),
        },
      };
    });
  }
}
