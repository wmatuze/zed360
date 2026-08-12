import { Injectable, NotFoundException } from '@nestjs/common';
import type { BusinessNotificationList } from '@zed360/contracts';
import {
  and,
  businessNotificationEvents,
  businessNotifications,
  businesses,
  desc,
  eq,
  sql,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

@Injectable()
export class BusinessNotificationsService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: AuthenticatedUser): Promise<BusinessNotificationList> {
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
}
