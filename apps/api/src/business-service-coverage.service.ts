import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BusinessServiceCoverage,
  UpdateBusinessServiceCoverage,
} from '@zed360/contracts';
import {
  and,
  asc,
  businessMembers,
  businesses,
  businessServiceCoverageAreas,
  businessServiceFulfillmentOptions,
  businessServices,
  categories,
  districts,
  eq,
  inArray,
  provinces,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

function optionalNumber(value: string | null) {
  return value === null ? null : Number(value);
}

@Injectable()
export class BusinessServiceCoverageService {
  constructor(private readonly database: DatabaseService) {}

  async getCoverage(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessServiceCoverage> {
    const business = await this.requireManager(user, businessId);
    const services = await this.database.db
      .select({
        id: businessServices.id,
        name: businessServices.name,
        categoryName: categories.name,
      })
      .from(businessServices)
      .innerJoin(categories, eq(businessServices.categoryId, categories.id))
      .where(
        and(
          eq(businessServices.businessId, businessId),
          eq(businessServices.status, 'active'),
        ),
      )
      .orderBy(asc(businessServices.name));

    if (!services.length) return { business, services: [] };

    const options = await this.database.db
      .select({
        id: businessServiceFulfillmentOptions.id,
        businessServiceId: businessServiceFulfillmentOptions.businessServiceId,
        mode: businessServiceFulfillmentOptions.mode,
        coverageScope: businessServiceFulfillmentOptions.coverageScope,
        feeMinimum: businessServiceFulfillmentOptions.feeMinimum,
        feeMaximum: businessServiceFulfillmentOptions.feeMaximum,
        leadTimeMinimumDays:
          businessServiceFulfillmentOptions.leadTimeMinimumDays,
        leadTimeMaximumDays:
          businessServiceFulfillmentOptions.leadTimeMaximumDays,
        notes: businessServiceFulfillmentOptions.notes,
        lastConfirmedAt: businessServiceFulfillmentOptions.lastConfirmedAt,
      })
      .from(businessServiceFulfillmentOptions)
      .where(
        and(
          inArray(
            businessServiceFulfillmentOptions.businessServiceId,
            services.map(({ id }) => id),
          ),
          eq(businessServiceFulfillmentOptions.isActive, true),
        ),
      );

    const areas = options.length
      ? await this.database.db
          .select({
            fulfillmentOptionId:
              businessServiceCoverageAreas.fulfillmentOptionId,
            districtId: businessServiceCoverageAreas.districtId,
            provinceId: businessServiceCoverageAreas.provinceId,
          })
          .from(businessServiceCoverageAreas)
          .where(
            inArray(
              businessServiceCoverageAreas.fulfillmentOptionId,
              options.map(({ id }) => id),
            ),
          )
      : [];

    return {
      business,
      services: services.map((service) => ({
        ...service,
        options: options
          .filter((option) => option.businessServiceId === service.id)
          .map((option) => ({
            id: option.id,
            mode: option.mode,
            coverageScope: option.coverageScope,
            districtIds: areas
              .filter(
                (area) =>
                  area.fulfillmentOptionId === option.id && area.districtId,
              )
              .map((area) => area.districtId!),
            provinceIds: areas
              .filter(
                (area) =>
                  area.fulfillmentOptionId === option.id && area.provinceId,
              )
              .map((area) => area.provinceId!),
            feeMinimum: optionalNumber(option.feeMinimum),
            feeMaximum: optionalNumber(option.feeMaximum),
            leadTimeMinimumDays: option.leadTimeMinimumDays,
            leadTimeMaximumDays: option.leadTimeMaximumDays,
            notes: option.notes,
            lastConfirmedAt: option.lastConfirmedAt?.toISOString() ?? null,
          })),
      })),
    };
  }

  async replaceServiceCoverage(
    user: AuthenticatedUser,
    businessId: string,
    serviceId: string,
    coverage: UpdateBusinessServiceCoverage,
  ): Promise<BusinessServiceCoverage> {
    await this.requireManager(user, businessId);
    const [service] = await this.database.db
      .select({ id: businessServices.id })
      .from(businessServices)
      .where(
        and(
          eq(businessServices.id, serviceId),
          eq(businessServices.businessId, businessId),
        ),
      )
      .limit(1);
    if (!service) {
      throw new NotFoundException('This business service is unavailable.');
    }

    const districtIds = [
      ...new Set(coverage.options.flatMap((option) => option.districtIds)),
    ];
    const provinceIds = [
      ...new Set(coverage.options.flatMap((option) => option.provinceIds)),
    ];
    const [validDistricts, validProvinces] = await Promise.all([
      districtIds.length
        ? this.database.db
            .select({ id: districts.id })
            .from(districts)
            .where(
              and(
                inArray(districts.id, districtIds),
                eq(districts.isActive, true),
              ),
            )
        : [],
      provinceIds.length
        ? this.database.db
            .select({ id: provinces.id })
            .from(provinces)
            .where(
              and(
                inArray(provinces.id, provinceIds),
                eq(provinces.isActive, true),
              ),
            )
        : [],
    ]);
    if (
      validDistricts.length !== districtIds.length ||
      validProvinces.length !== provinceIds.length
    ) {
      throw new NotFoundException(
        'One or more selected service areas are unavailable.',
      );
    }

    const now = new Date();
    await this.database.db.transaction(async (transaction) => {
      await transaction
        .delete(businessServiceFulfillmentOptions)
        .where(
          eq(businessServiceFulfillmentOptions.businessServiceId, serviceId),
        );

      for (const option of coverage.options) {
        const [createdOption] = await transaction
          .insert(businessServiceFulfillmentOptions)
          .values({
            businessServiceId: serviceId,
            mode: option.mode,
            coverageScope: option.coverageScope,
            feeMinimum: option.feeMinimum?.toFixed(2),
            feeMaximum: option.feeMaximum?.toFixed(2),
            leadTimeMinimumDays: option.leadTimeMinimumDays,
            leadTimeMaximumDays: option.leadTimeMaximumDays,
            notes: option.notes || undefined,
            lastConfirmedAt: now,
          })
          .returning({ id: businessServiceFulfillmentOptions.id });
        if (!createdOption) {
          throw new Error('The service coverage could not be saved.');
        }

        const areas = [
          ...(option.coverageScope === 'selected_districts'
            ? option.districtIds.map((districtId) => ({ districtId }))
            : []),
          ...(option.coverageScope === 'selected_provinces'
            ? option.provinceIds.map((provinceId) => ({ provinceId }))
            : []),
        ];
        if (areas.length) {
          await transaction.insert(businessServiceCoverageAreas).values(
            areas.map((area) => ({
              fulfillmentOptionId: createdOption.id,
              ...area,
            })),
          );
        }
      }
    });

    return this.getCoverage(user, businessId);
  }

  private async requireManager(user: AuthenticatedUser, businessId: string) {
    const [membership] = await this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
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

    if (!membership) {
      throw new NotFoundException('This business is unavailable.');
    }
    if (membership.role === 'staff') {
      throw new ForbiddenException(
        'An owner or manager is required to edit service coverage.',
      );
    }
    return { id: membership.id, name: membership.name };
  }
}
