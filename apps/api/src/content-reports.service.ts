import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminContentReportQueue,
  ContentReportDecision,
  SubmitContentReport,
} from '@zed360/contracts';
import {
  and,
  businessReviews,
  businesses,
  contentReports,
  eq,
  reviews,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

const HOUR = 60 * 60 * 1000;

@Injectable()
export class ContentReportsService {
  private readonly rateLimits = new Map<
    string,
    { count: number; resetsAt: number }
  >();

  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
  ) {}

  async submit(report: SubmitContentReport, requesterKey: string) {
    this.checkRateLimit(requesterKey);
    await this.requirePublicTarget(report.targetType, report.targetId);
    const [created] = await this.database.db
      .insert(contentReports)
      .values({
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        details: report.details,
        reporterEmail: report.reporterEmail || null,
      })
      .returning({ id: contentReports.id, status: contentReports.status });
    if (!created) throw new Error('The report could not be saved.');
    return created;
  }

  async list(user: AuthenticatedUser): Promise<AdminContentReportQueue> {
    const viewerRole = await this.authorization.requireReviewer(user);
    const rows = (await this.database.client`
      select report.id,
             report.target_type as "targetType",
             report.target_id as "targetId",
             report.reason,
             report.details,
             report.reporter_email as "reporterEmail",
             report.created_at as "createdAt",
             case report.target_type
               when 'business' then coalesce(target_business.name, 'Unavailable business')
               when 'review' then coalesce(review_business.name || ' customer review', 'Unavailable review')
             end as "targetLabel"
      from content_reports report
      left join businesses target_business
        on report.target_type = 'business' and target_business.id = report.target_id
      left join reviews target_review
        on report.target_type = 'review' and target_review.id = report.target_id
      left join businesses review_business on review_business.id = target_review.business_id
      where report.status = 'open'
      order by report.created_at asc
    `) as Array<{
      id: string;
      targetType: 'business' | 'review';
      targetId: string;
      targetLabel: string;
      reason: SubmitContentReport['reason'];
      details: string;
      reporterEmail: string | null;
      createdAt: Date;
    }>;
    return {
      viewerRole,
      reports: rows.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
      })),
    };
  }

  async decide(
    user: AuthenticatedUser,
    reportId: string,
    decision: ContentReportDecision,
  ) {
    const viewerRole = await this.authorization.requireReviewer(user);
    const now = new Date();
    await this.database.db.transaction(async (transaction) => {
      const [report] = await transaction
        .select()
        .from(contentReports)
        .where(eq(contentReports.id, reportId))
        .limit(1)
        .for('update');
      if (!report) throw new NotFoundException('Report not found.');
      if (report.status !== 'open') {
        throw new ConflictException('This report was already decided.');
      }

      if (decision.decision === 'content_removed') {
        if (report.targetType !== 'review') {
          throw new ConflictException(
            'This report target cannot use the content-removal action.',
          );
        }
        const removed = await transaction
          .update(reviews)
          .set({
            moderationStatus: 'rejected',
            moderationNote: `Removed after report: ${decision.note}`,
            reviewedByUserId: user.id,
            reviewedAt: now,
            isPublished: false,
            updatedAt: now,
          })
          .where(eq(reviews.id, report.targetId))
          .returning({ id: reviews.id });
        if (!removed.length) throw new NotFoundException('Review not found.');
      }

      if (decision.decision === 'business_suspended') {
        if (report.targetType !== 'business') {
          throw new ConflictException(
            'Only a business report can suspend a business.',
          );
        }
        if (viewerRole !== 'admin') {
          throw new ForbiddenException(
            'Administrator access is required to suspend a business.',
          );
        }
        const suspended = await transaction
          .update(businesses)
          .set({ status: 'suspended', updatedAt: now })
          .where(
            and(
              eq(businesses.id, report.targetId),
              eq(businesses.status, 'active'),
              eq(businesses.reviewStatus, 'approved'),
            ),
          )
          .returning({ id: businesses.id });
        if (!suspended.length) {
          throw new ConflictException(
            'This business is no longer active and approved.',
          );
        }
        await transaction.insert(businessReviews).values({
          businessId: report.targetId,
          decision: 'suspended',
          reason: `Content report: ${decision.note}`,
          reviewedByUserId: user.id,
          createdAt: now,
        });
      }

      await transaction
        .update(contentReports)
        .set({
          status: decision.decision === 'dismissed' ? 'dismissed' : 'actioned',
          decisionNote: decision.note,
          reviewedByUserId: user.id,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(contentReports.id, report.id));
    });
    return this.list(user);
  }

  private async requirePublicTarget(
    targetType: SubmitContentReport['targetType'],
    targetId: string,
  ) {
    const rows =
      targetType === 'business'
        ? await this.database.db
            .select({ id: businesses.id })
            .from(businesses)
            .where(
              and(
                eq(businesses.id, targetId),
                eq(businesses.status, 'active'),
                eq(businesses.reviewStatus, 'approved'),
              ),
            )
            .limit(1)
        : await this.database.db
            .select({ id: reviews.id })
            .from(reviews)
            .innerJoin(businesses, eq(reviews.businessId, businesses.id))
            .where(
              and(
                eq(reviews.id, targetId),
                eq(reviews.moderationStatus, 'approved'),
                eq(reviews.isPublished, true),
                eq(businesses.status, 'active'),
                eq(businesses.reviewStatus, 'approved'),
              ),
            )
            .limit(1);
    if (!rows.length) {
      throw new NotFoundException('This report target is unavailable.');
    }
  }

  private checkRateLimit(key: string) {
    const now = Date.now();
    if (this.rateLimits.size > 1000) {
      for (const [entryKey, value] of this.rateLimits) {
        if (value.resetsAt <= now) this.rateLimits.delete(entryKey);
      }
    }
    const current = this.rateLimits.get(key);
    if (!current || current.resetsAt <= now) {
      this.rateLimits.set(key, { count: 1, resetsAt: now + HOUR });
      return;
    }
    if (current.count >= 5) {
      throw new HttpException(
        'Too many reports were submitted. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    current.count += 1;
  }
}
