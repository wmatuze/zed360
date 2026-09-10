import { Injectable } from '@nestjs/common';
import { adminAuditEvents } from '@zed360/database';
import { DatabaseService } from './database.service';

export type AdminAuditEvent = {
  actorUserId: string;
  action: string;
  subjectType: string;
  subjectId: string;
  reason?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AdminAuditService {
  constructor(private readonly database: DatabaseService) {}

  async record(event: AdminAuditEvent): Promise<string> {
    const [created] = await this.database.db
      .insert(adminAuditEvents)
      .values({
        ...event,
        reason: event.reason || null,
        beforeState: event.beforeState || null,
        afterState: event.afterState || null,
        metadata: event.metadata ?? {},
      })
      .returning({ id: adminAuditEvents.id });

    if (!created)
      throw new Error('The administrator audit event was not saved.');
    return created.id;
  }
}
