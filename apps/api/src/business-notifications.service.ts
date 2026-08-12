import { Injectable, NotFoundException } from '@nestjs/common';
import type { BusinessNotificationList } from '@zed360/contracts';
import {
  and,
  businessMembers,
  businessNotificationEvents,
  businessNotifications,
  businesses,
  customerRequests,
  desc,
  eq,
  inArray,
  requestMatches,
  sql,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

@Injectable()
export class BusinessNotificationsService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: AuthenticatedUser): Promise<BusinessNotificationList> {
    await this.materialize(user.id);
    const rows = await this.database.db
      .select({
        id: businessNotifications.id,
        type: businessNotificationEvents.type,
        title: businessNotificationEvents.title,
        body: businessNotificationEvents.body,
        actionUrl: businessNotificationEvents.actionUrl,
        businessId: businesses.id,
        businessName: businesses.name,
        readAt: businessNotifications.readAt,
        createdAt: businessNotifications.createdAt,
      })
      .from(businessNotifications)
      .innerJoin(
        businessNotificationEvents,
        eq(businessNotifications.eventId, businessNotificationEvents.id),
      )
      .innerJoin(
        businesses,
        eq(businessNotificationEvents.businessId, businesses.id),
      )
      .where(eq(businessNotifications.recipientUserId, user.id))
      .orderBy(desc(businessNotifications.createdAt))
      .limit(100);

    return {
      notifications: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        actionUrl: row.actionUrl,
        business: { id: row.businessId, name: row.businessName },
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      unreadCount: rows.filter((row) => row.readAt === null).length,
    };
  }

  async markRead(user: AuthenticatedUser, notificationId: string) {
    const [updated] = await this.database.db
      .update(businessNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(businessNotifications.id, notificationId),
          eq(businessNotifications.recipientUserId, user.id),
        ),
      )
      .returning({ id: businessNotifications.id });
    if (!updated) throw new NotFoundException('Notification not found.');
    return this.list(user);
  }

  async markAllRead(user: AuthenticatedUser) {
    await this.materialize(user.id);
    await this.database.db
      .update(businessNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(businessNotifications.recipientUserId, user.id),
          sql`${businessNotifications.readAt} is null`,
        ),
      );
    return this.list(user);
  }

  private async materialize(userId: string) {
    const memberships = await this.database.db
      .select({ businessId: businessMembers.businessId })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.userId, userId),
          inArray(businessMembers.role, ['owner', 'manager']),
        ),
      );
    if (!memberships.length) return;

    const businessIds = memberships.map(({ businessId }) => businessId);
    const visibleMatches = await this.database.db
      .select({
        id: requestMatches.id,
        businessId: requestMatches.businessId,
        requestId: customerRequests.id,
        summary: customerRequests.summary,
      })
      .from(requestMatches)
      .innerJoin(
        customerRequests,
        eq(requestMatches.requestId, customerRequests.id),
      )
      .innerJoin(businesses, eq(requestMatches.businessId, businesses.id))
      .where(
        and(
          inArray(requestMatches.businessId, businessIds),
          inArray(requestMatches.status, ['queued', 'sent', 'viewed']),
          inArray(customerRequests.status, ['open', 'matched']),
          eq(businesses.status, 'active'),
          eq(businesses.reviewStatus, 'approved'),
        ),
      );
    if (visibleMatches.length) {
      await this.database.db
        .insert(businessNotificationEvents)
        .values(
          visibleMatches.map((match) => ({
            businessId: match.businessId,
            type: 'request_matched' as const,
            title: 'New matched request',
            body: match.summary,
            actionUrl: '/business/requests',
            eventKey: `request-match:${match.id}`,
            data: { requestId: match.requestId, matchId: match.id },
          })),
        )
        .onConflictDoNothing();
    }

    const events = await this.database.db
      .select({ id: businessNotificationEvents.id })
      .from(businessNotificationEvents)
      .where(inArray(businessNotificationEvents.businessId, businessIds));
    if (!events.length) return;

    await this.database.db
      .insert(businessNotifications)
      .values(
        events.map((event) => ({
          eventId: event.id,
          recipientUserId: userId,
        })),
      )
      .onConflictDoNothing();
  }
}
