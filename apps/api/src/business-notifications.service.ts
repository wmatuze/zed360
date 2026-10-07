import { Injectable, NotFoundException } from '@nestjs/common';
import type { BusinessNotificationList } from '@zed360/contracts';
import {
  and,
  businessNotificationEvents,
  businessNotifications,
  businesses,
  desc,
  eq,
  isNotNull,
  isNull,
  sql,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

@Injectable()
export class BusinessNotificationsService {
  constructor(private readonly database: DatabaseService) {}

  async list(
    user: AuthenticatedUser,
    options: { view: 'inbox' | 'archived'; page: number } = {
      view: 'inbox',
      page: 1,
    },
  ): Promise<BusinessNotificationList> {
    const pageSize = 25;
    const viewCondition =
      options.view === 'archived'
        ? isNotNull(businessNotifications.archivedAt)
        : isNull(businessNotifications.archivedAt);
    const listCondition = and(
      eq(businessNotifications.recipientUserId, user.id),
      viewCondition,
    );
    const [counts, rows] = await Promise.all([
      Promise.all([
        this.database.db
          .select({ value: sql<number>`count(*)::int` })
          .from(businessNotifications)
          .where(listCondition),
        this.database.db
          .select({ value: sql<number>`count(*)::int` })
          .from(businessNotifications)
          .where(
            and(
              eq(businessNotifications.recipientUserId, user.id),
              isNull(businessNotifications.archivedAt),
              isNull(businessNotifications.readAt),
            ),
          ),
      ]),
      this.database.db
        .select({
          id: businessNotifications.id,
          type: businessNotificationEvents.type,
          title: businessNotificationEvents.title,
          body: businessNotificationEvents.body,
          actionUrl: businessNotificationEvents.actionUrl,
          businessId: businesses.id,
          businessName: businesses.name,
          readAt: businessNotifications.readAt,
          archivedAt: businessNotifications.archivedAt,
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
        .where(listCondition)
        .orderBy(desc(businessNotifications.createdAt))
        .limit(pageSize)
        .offset((options.page - 1) * pageSize),
    ]);
    const totalCount = counts[0][0]?.value ?? 0;
    const unreadCount = counts[1][0]?.value ?? 0;

    return {
      notifications: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        actionUrl: row.actionUrl,
        business: { id: row.businessId, name: row.businessName },
        readAt: row.readAt?.toISOString() ?? null,
        archivedAt: row.archivedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      unreadCount,
      totalCount,
      page: options.page,
      pageSize,
      totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize),
      view: options.view,
    };
  }

  /**
   * Marks a notification as read and says where it leads: the request it is
   * about if that is still open, or request history once it has ended.
   */
  async open(user: AuthenticatedUser, notificationId: string) {
    const [opened] = await this.database.client`
      update business_notifications notification
      set read_at = coalesce(notification.read_at, now())
      from business_notification_events event
      where event.id = notification.event_id
        and notification.id = ${notificationId}
        and notification.recipient_user_id = ${user.id}
      returning event.type, event.business_id as "businessId",
                event.data ->> 'requestId' as "requestId",
                event.action_url as "actionUrl"
    `;
    if (!opened) throw new NotFoundException('Notification not found.');

    const requestId =
      typeof opened.requestId === 'string' &&
      /^[0-9a-f-]{36}$/i.test(opened.requestId)
        ? opened.requestId
        : null;
    if (
      requestId &&
      (opened.type === 'request_matched' || opened.type === 'customer_selected')
    ) {
      const [active] = await this.database.client`
        select 1 from request_matches matched
        inner join customer_requests request on request.id = matched.request_id
        where matched.request_id = ${requestId}
          and matched.business_id = ${String(opened.businessId)}
          and request.status in ('open', 'matched')
          and matched.status in ('queued', 'sent', 'viewed', 'responded')
          and (request.expires_at is null or request.expires_at > now())
        limit 1
      `;
      return {
        destination: active
          ? `/business/requests#request-${requestId}`
          : `/business/requests/history#request-${requestId}`,
      };
    }

    const stored =
      typeof opened.actionUrl === 'string' ? opened.actionUrl : null;
    return {
      destination:
        stored &&
        /^\/(?![/\\])/.test(stored) &&
        stored !== '/business/notifications'
          ? stored
          : '/business/notifications',
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
    return { success: true };
  }

  async markAllRead(user: AuthenticatedUser) {
    await this.database.db
      .update(businessNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(businessNotifications.recipientUserId, user.id),
          sql`${businessNotifications.readAt} is null`,
        ),
      );
    return { success: true };
  }

  async archive(user: AuthenticatedUser, notificationId: string) {
    const now = new Date();
    const [updated] = await this.database.db
      .update(businessNotifications)
      .set({
        archivedAt: now,
        readAt: sql`coalesce(${businessNotifications.readAt}, now())`,
      })
      .where(
        and(
          eq(businessNotifications.id, notificationId),
          eq(businessNotifications.recipientUserId, user.id),
        ),
      )
      .returning({ id: businessNotifications.id });
    if (!updated) throw new NotFoundException('Notification not found.');
    return { success: true };
  }

  async restore(user: AuthenticatedUser, notificationId: string) {
    const [updated] = await this.database.db
      .update(businessNotifications)
      .set({ archivedAt: null })
      .where(
        and(
          eq(businessNotifications.id, notificationId),
          eq(businessNotifications.recipientUserId, user.id),
        ),
      )
      .returning({ id: businessNotifications.id });
    if (!updated) throw new NotFoundException('Notification not found.');
    return { success: true };
  }

  async archiveAllRead(user: AuthenticatedUser) {
    await this.database.db
      .update(businessNotifications)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(businessNotifications.recipientUserId, user.id),
          isNull(businessNotifications.archivedAt),
          isNotNull(businessNotifications.readAt),
        ),
      );
    return { success: true };
  }
}
