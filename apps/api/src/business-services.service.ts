import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BusinessServiceManagement,
  SaveBusinessService,
} from '@zed360/contracts';
import {
  and,
  asc,
  businessMembers,
  businesses,
  businessServiceFulfillmentOptions,
  businessServices,
  categories,
  eq,
  inArray,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

function optionalNumber(value: string | null) {
  return value === null ? null : Number(value);
}

@Injectable()
export class BusinessServicesService {
  constructor(private readonly database: DatabaseService) {}

  async get(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessServiceManagement> {
    const business = await this.requireManager(user, businessId);
    const services = await this.database.db
      .select({
        id: businessServices.id,
        categoryId: businessServices.categoryId,
        categoryName: categories.name,
        name: businessServices.name,
        description: businessServices.description,
        priceFrom: businessServices.priceFrom,
        priceTo: businessServices.priceTo,
        isAvailable: businessServices.isAvailable,
        status: businessServices.status,
        lastConfirmedAt: businessServices.lastConfirmedAt,
      })
      .from(businessServices)
      .innerJoin(categories, eq(businessServices.categoryId, categories.id))
      .where(eq(businessServices.businessId, businessId))
      .orderBy(asc(businessServices.status), asc(businessServices.name));

    const optionRows = services.length
      ? await this.database.db
          .select({
            serviceId: businessServiceFulfillmentOptions.businessServiceId,
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
          )
      : [];

    return {
      business,
      services: services.map((service) => ({
        ...service,
        priceFrom: optionalNumber(service.priceFrom),
        priceTo: optionalNumber(service.priceTo),
        lastConfirmedAt: service.lastConfirmedAt?.toISOString() ?? null,
        coverageModes: optionRows.filter(
          ({ serviceId }) => serviceId === service.id,
        ).length,
      })),
    };
  }

  async create(
    user: AuthenticatedUser,
    businessId: string,
    input: SaveBusinessService,
  ) {
    await this.requireManager(user, businessId);
    await this.requireCategory(input.categoryId);
    await this.requireUniqueName(businessId, input.name);

    const activeServices = await this.database.db
      .select({ id: businessServices.id })
      .from(businessServices)
      .where(
        and(
          eq(businessServices.businessId, businessId),
          eq(businessServices.status, 'active'),
        ),
      );
    if (activeServices.length >= 50) {
      throw new ConflictException(
        'A business may have up to 50 active services during the pilot.',
      );
    }

    await this.database.db.insert(businessServices).values({
      businessId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description || undefined,
      priceFrom: input.priceFrom?.toFixed(2),
      priceTo: input.priceTo?.toFixed(2),
      isAvailable: input.status === 'active' && input.isAvailable,
      status: input.status,
      lastConfirmedAt: new Date(),
    });
    return this.get(user, businessId);
  }

  async update(
    user: AuthenticatedUser,
    businessId: string,
    serviceId: string,
    input: SaveBusinessService,
  ) {
    await this.requireManager(user, businessId);
    await this.requireCategory(input.categoryId);
    await this.requireUniqueName(businessId, input.name, serviceId);

    const updated = await this.database.db
      .update(businessServices)
      .set({
        categoryId: input.categoryId,
        name: input.name,
        description: input.description || null,
        priceFrom: input.priceFrom?.toFixed(2) ?? null,
        priceTo: input.priceTo?.toFixed(2) ?? null,
        isAvailable: input.status === 'active' && input.isAvailable,
        status: input.status,
        lastConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessServices.id, serviceId),
          eq(businessServices.businessId, businessId),
        ),
      )
      .returning({ id: businessServices.id });
    if (!updated.length) throw new NotFoundException('Service not found.');
    return this.get(user, businessId);
  }

  private async requireCategory(categoryId: string) {
    const [category] = await this.database.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.isActive, true)))
      .limit(1);
    if (!category) throw new NotFoundException('Category not found.');
  }

  private async requireUniqueName(
    businessId: string,
    name: string,
    currentId?: string,
  ) {
    const services = await this.database.db
      .select({ id: businessServices.id, name: businessServices.name })
      .from(businessServices)
      .where(eq(businessServices.businessId, businessId));
    const duplicate = services.some(
      (service) =>
        service.id !== currentId &&
        service.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (duplicate) {
      throw new ConflictException('A service with this name already exists.');
    }
  }

  private async requireManager(user: AuthenticatedUser, businessId: string) {
    const [membership] = await this.database.db
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
    if (!membership) {
      throw new NotFoundException('This business is unavailable.');
    }
    if (membership.role === 'staff') {
      throw new ForbiddenException(
        'An owner or manager is required to edit services.',
      );
    }
    return {
      id: membership.id,
      name: membership.name,
      slug: membership.slug,
    };
  }
}
