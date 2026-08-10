import { Injectable } from '@nestjs/common';
import type {
  MatchedBusinessRequest,
  MatchedBusinessRequests,
} from '@zed360/contracts';
import {
  and,
  businessMembers,
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
}
