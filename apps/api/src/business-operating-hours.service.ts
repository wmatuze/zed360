import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BusinessOperatingHours,
  UpdateLocationOperatingHours,
} from '@zed360/contracts';
import {
  and,
  asc,
  businessLocations,
  businessMembers,
  businesses,
  districts,
  eq,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { BUSINESS_TIMEZONE, normaliseOperatingHours } from './operating-hours';

@Injectable()
export class BusinessOperatingHoursService {
  constructor(private readonly database: DatabaseService) {}

  async get(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessOperatingHours> {
    const business = await this.requireManager(user, businessId);
    const locations = await this.database.db
      .select({
        id: businessLocations.id,
        name: businessLocations.name,
        isPrimary: businessLocations.isPrimary,
        districtName: districts.name,
        openingHours: businessLocations.openingHours,
      })
      .from(businessLocations)
      .leftJoin(districts, eq(businessLocations.districtId, districts.id))
      .where(
        and(
          eq(businessLocations.businessId, businessId),
          eq(businessLocations.isActive, true),
        ),
      )
      .orderBy(asc(businessLocations.name));
    return {
      business: { id: business.id, name: business.name, slug: business.slug },
      timezone: BUSINESS_TIMEZONE,
      locations: locations.map(({ openingHours, ...location }) => ({
        ...location,
        operatingHours: normaliseOperatingHours(openingHours),
      })),
    };
  }

  async updateLocation(
    user: AuthenticatedUser,
    businessId: string,
    locationId: string,
    update: UpdateLocationOperatingHours,
  ): Promise<BusinessOperatingHours> {
    await this.requireManager(user, businessId);
    const [updated] = await this.database.db
      .update(businessLocations)
      .set({
        openingHours: update,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessLocations.id, locationId),
          eq(businessLocations.businessId, businessId),
          eq(businessLocations.isActive, true),
        ),
      )
      .returning({ id: businessLocations.id });
    if (!updated) throw new NotFoundException('This location is unavailable.');
    return this.get(user, businessId);
  }

  private async requireManager(user: AuthenticatedUser, businessId: string) {
    const [row] = await this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
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
        'An owner or manager is required to update operating hours.',
      );
    }
    return row;
  }
}
