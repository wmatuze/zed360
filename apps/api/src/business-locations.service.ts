import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BusinessLocationManagement,
  SaveBusinessLocation,
} from '@zed360/contracts';
import {
  and,
  asc,
  businessLocations,
  businessMembers,
  businesses,
  districts,
  eq,
  provinces,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { normaliseOperatingHours } from './operating-hours';

const MAX_ACTIVE_LOCATIONS = 20;

@Injectable()
export class BusinessLocationsService {
  constructor(private readonly database: DatabaseService) {}

  async get(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessLocationManagement> {
    const business = await this.requireManager(user, businessId);
    const rows = await this.locationRows(businessId);
    return {
      business: { id: business.id, name: business.name, slug: business.slug },
      locations: rows.map(({ openingHours, ...location }) => ({
        ...location,
        operatingHoursConfigured:
          normaliseOperatingHours(openingHours).configured,
      })),
    };
  }

  async create(
    user: AuthenticatedUser,
    businessId: string,
    input: SaveBusinessLocation,
  ) {
    await this.requireManager(user, businessId);
    await this.requireDistrict(input.districtId);
    const active = await this.activeLocations(businessId);
    if (active.length >= MAX_ACTIVE_LOCATIONS) {
      throw new BadRequestException(
        `A business can have up to ${MAX_ACTIVE_LOCATIONS} active locations.`,
      );
    }
    await this.database.db.insert(businessLocations).values({
      businessId,
      districtId: input.districtId,
      name: input.name,
      address: input.address || null,
      isPrimary: active.length === 0,
    });
    return this.get(user, businessId);
  }

  async update(
    user: AuthenticatedUser,
    businessId: string,
    locationId: string,
    input: SaveBusinessLocation,
  ) {
    await this.requireManager(user, businessId);
    await this.requireDistrict(input.districtId);
    const [updated] = await this.database.db
      .update(businessLocations)
      .set({
        districtId: input.districtId,
        name: input.name,
        address: input.address || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessLocations.id, locationId),
          eq(businessLocations.businessId, businessId),
        ),
      )
      .returning({ id: businessLocations.id });
    if (!updated) throw new NotFoundException('This location is unavailable.');
    return this.get(user, businessId);
  }

  async makePrimary(
    user: AuthenticatedUser,
    businessId: string,
    locationId: string,
  ) {
    await this.requireManager(user, businessId);
    const locations = await this.activeLocations(businessId);
    if (!locations.some(({ id }) => id === locationId)) {
      throw new BadRequestException('Only an active location can be primary.');
    }
    await this.database.db.transaction(async (transaction) => {
      await transaction
        .update(businessLocations)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(businessLocations.businessId, businessId));
      await transaction
        .update(businessLocations)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(
          and(
            eq(businessLocations.id, locationId),
            eq(businessLocations.businessId, businessId),
          ),
        );
    });
    return this.get(user, businessId);
  }

  async setStatus(
    user: AuthenticatedUser,
    businessId: string,
    locationId: string,
    isActive: boolean,
  ) {
    await this.requireManager(user, businessId);
    const rows = await this.locationRows(businessId);
    const target = rows.find(({ id }) => id === locationId);
    if (!target) throw new NotFoundException('This location is unavailable.');
    if (target.isActive === isActive) return this.get(user, businessId);
    const active = rows.filter((location) => location.isActive);
    if (!isActive && active.length === 1) {
      throw new BadRequestException(
        'A business must keep at least one active location.',
      );
    }
    if (isActive && active.length >= MAX_ACTIVE_LOCATIONS) {
      throw new BadRequestException(
        `A business can have up to ${MAX_ACTIVE_LOCATIONS} active locations.`,
      );
    }
    await this.database.db.transaction(async (transaction) => {
      await transaction
        .update(businessLocations)
        .set({
          isActive,
          isPrimary: !isActive && target.isPrimary ? false : target.isPrimary,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(businessLocations.id, locationId),
            eq(businessLocations.businessId, businessId),
          ),
        );
      if (!isActive && target.isPrimary) {
        const replacement = active.find(({ id }) => id !== locationId);
        if (replacement) {
          await transaction
            .update(businessLocations)
            .set({ isPrimary: true, updatedAt: new Date() })
            .where(eq(businessLocations.id, replacement.id));
        }
      }
    });
    return this.get(user, businessId);
  }

  private locationRows(businessId: string) {
    return this.database.db
      .select({
        id: businessLocations.id,
        name: businessLocations.name,
        address: businessLocations.address,
        districtId: businessLocations.districtId,
        districtName: districts.name,
        provinceName: provinces.name,
        isPrimary: businessLocations.isPrimary,
        isActive: businessLocations.isActive,
        openingHours: businessLocations.openingHours,
      })
      .from(businessLocations)
      .leftJoin(districts, eq(businessLocations.districtId, districts.id))
      .leftJoin(provinces, eq(districts.provinceId, provinces.id))
      .where(eq(businessLocations.businessId, businessId))
      .orderBy(asc(businessLocations.name));
  }

  private activeLocations(businessId: string) {
    return this.database.db
      .select({ id: businessLocations.id })
      .from(businessLocations)
      .where(
        and(
          eq(businessLocations.businessId, businessId),
          eq(businessLocations.isActive, true),
        ),
      );
  }

  private async requireDistrict(districtId: string) {
    const [district] = await this.database.db
      .select({ id: districts.id })
      .from(districts)
      .where(eq(districts.id, districtId))
      .limit(1);
    if (!district)
      throw new NotFoundException('The selected district is unavailable.');
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
    if (row.role === 'staff')
      throw new ForbiddenException(
        'An owner or manager is required to manage locations.',
      );
    return row;
  }
}
