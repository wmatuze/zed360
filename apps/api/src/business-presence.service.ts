import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BusinessPresence,
  UpdateBusinessPresence,
} from '@zed360/contracts';
import { and, businessMembers, businesses, eq } from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

const DAY = 24 * 60 * 60 * 1000;

export function freshness(
  value: Date | null,
  maximumAgeDays: number,
  now = new Date(),
): 'current' | 'stale' | 'unconfirmed' {
  if (!value) return 'unconfirmed';
  return now.getTime() - value.getTime() <= maximumAgeDays * DAY
    ? 'current'
    : 'stale';
}

@Injectable()
export class BusinessPresenceService {
  constructor(private readonly database: DatabaseService) {}

  async get(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessPresence> {
    return this.toPresence(await this.requireManager(user, businessId));
  }

  async updateAvailability(
    user: AuthenticatedUser,
    businessId: string,
    update: UpdateBusinessPresence,
  ): Promise<BusinessPresence> {
    await this.requireManager(user, businessId);
    const now = new Date();
    await this.database.db
      .update(businesses)
      .set({
        availabilityStatus: update.availability,
        availabilityNote: update.note || null,
        availabilityUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(businesses.id, businessId));
    return this.get(user, businessId);
  }

  async confirmProfile(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessPresence> {
    await this.requireManager(user, businessId);
    const now = new Date();
    await this.database.db
      .update(businesses)
      .set({ lastConfirmedAt: now, updatedAt: now })
      .where(eq(businesses.id, businessId));
    return this.get(user, businessId);
  }

  private toPresence(
    business: Awaited<ReturnType<BusinessPresenceService['requireManager']>>,
  ): BusinessPresence {
    return {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
      },
      availability: {
        status: business.availabilityStatus,
        note: business.availabilityNote,
        updatedAt: business.availabilityUpdatedAt?.toISOString() ?? null,
        freshness: freshness(business.availabilityUpdatedAt, 7),
      },
      profile: {
        lastConfirmedAt: business.lastConfirmedAt?.toISOString() ?? null,
        freshness: freshness(business.lastConfirmedAt, 90),
      },
    };
  }

  private async requireManager(user: AuthenticatedUser, businessId: string) {
    const [row] = await this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        availabilityStatus: businesses.availabilityStatus,
        availabilityNote: businesses.availabilityNote,
        availabilityUpdatedAt: businesses.availabilityUpdatedAt,
        lastConfirmedAt: businesses.lastConfirmedAt,
        role: businessMembers.role,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
      .where(
        and(
          eq(businessMembers.userId, user.id),
          eq(businessMembers.businessId, businessId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('This business is unavailable.');
    if (row.role === 'staff') {
      throw new ForbiddenException(
        'An owner or manager is required to update business availability.',
      );
    }
    return row;
  }
}
