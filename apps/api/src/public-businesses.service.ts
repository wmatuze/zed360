import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PublicBusinessDirectory,
  PublicBusinessDirectoryQuery,
  PublicBusinessProfile,
} from '@zed360/contracts';
import {
  and,
  asc,
  businessLocations,
  businessMediaAssets,
  businessProducts,
  businesses,
  businessServiceCoverageAreas,
  businessServiceFulfillmentOptions,
  businessServices,
  businessVerifications,
  categories,
  desc,
  districts,
  eq,
  inArray,
  provinces,
  sql,
} from '@zed360/database';
import type { SQL } from 'drizzle-orm';
import { DatabaseService } from './database.service';
import { publicMediaUrl } from './media-storage';

const pageSize = 18;

function optionalNumber(value: string | null) {
  return value === null ? null : Number(value);
}

@Injectable()
export class PublicBusinessesService {
  constructor(private readonly database: DatabaseService) {}

  async getDirectory(
    query: PublicBusinessDirectoryQuery,
  ): Promise<PublicBusinessDirectory> {
    const filters = this.directoryFilters(query);
    const where = and(...filters);
    const offset = (query.page - 1) * pageSize;

    const [countRows, businessRows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(businesses)
        .where(where),
      this.database.db
        .select({
          id: businesses.id,
          slug: businesses.slug,
          name: businesses.name,
          description: businesses.description,
          logoUrl: businesses.logoUrl,
          coverUrl: businesses.coverUrl,
          lastConfirmedAt: businesses.lastConfirmedAt,
        })
        .from(businesses)
        .where(where)
        .orderBy(
          sql`${businesses.lastConfirmedAt} desc nulls last`,
          asc(businesses.name),
        )
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = countRows[0]?.total ?? 0;
    if (!businessRows.length) {
      return {
        businesses: [],
        page: query.page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    const related = await this.loadRelated(
      businessRows.map((business) => business.id),
    );

    return {
      businesses: businessRows.map((business) => {
        const services = related.services.filter(
          (service) => service.businessId === business.id,
        );
        const serviceIds = new Set(services.map((service) => service.id));
        const modes = related.options
          .filter((option) => serviceIds.has(option.businessServiceId))
          .map((option) => option.mode);
        const categories = services.map((service) => ({
          name: service.categoryName,
          slug: service.categorySlug,
        }));

        const primaryLocationRow =
          related.locations.find(
            (location) =>
              location.businessId === business.id && location.isPrimary,
          ) ??
          related.locations.find(
            (location) => location.businessId === business.id,
          );
        const primaryLocation = primaryLocationRow
          ? {
              id: primaryLocationRow.id,
              name: primaryLocationRow.name,
              isPrimary: primaryLocationRow.isPrimary,
              district: primaryLocationRow.district,
            }
          : null;
        const businessMedia = related.media.filter(
          (asset) => asset.businessId === business.id,
        );
        const approvedLogo = businessMedia.find(
          (asset) => asset.purpose === 'logo',
        );
        const approvedCover = businessMedia.find(
          (asset) => asset.purpose === 'cover',
        );

        return {
          ...business,
          logoUrl: approvedLogo
            ? publicMediaUrl(
                approvedLogo.storageBucket,
                approvedLogo.storagePath,
              )
            : business.logoUrl,
          coverUrl: approvedCover
            ? publicMediaUrl(
                approvedCover.storageBucket,
                approvedCover.storagePath,
              )
            : business.coverUrl,
          lastConfirmedAt: business.lastConfirmedAt?.toISOString() ?? null,
          trust: this.trustFor(business.id, related.verifications),
          primaryLocation,
          categories: categories.filter(
            (category, index) =>
              categories.findIndex(({ slug }) => slug === category.slug) ===
              index,
          ),
          serviceNames: services.slice(0, 4).map((service) => service.name),
          fulfillmentModes: [...new Set(modes)],
        };
      }),
      page: query.page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getProfile(slug: string): Promise<PublicBusinessProfile> {
    const [business] = await this.database.db
      .select({
        id: businesses.id,
        slug: businesses.slug,
        name: businesses.name,
        description: businesses.description,
        phone: businesses.phone,
        whatsapp: businesses.whatsapp,
        email: businesses.email,
        website: businesses.website,
        logoUrl: businesses.logoUrl,
        coverUrl: businesses.coverUrl,
        lastConfirmedAt: businesses.lastConfirmedAt,
      })
      .from(businesses)
      .where(
        and(
          eq(businesses.slug, slug),
          eq(businesses.status, 'active'),
          eq(businesses.reviewStatus, 'approved'),
        ),
      )
      .limit(1);

    if (!business) {
      throw new NotFoundException('This business profile is unavailable.');
    }

    const related = await this.loadRelated([business.id]);
    const approvedLogo = related.media.find(
      (asset) => asset.purpose === 'logo',
    );
    const approvedCover = related.media.find(
      (asset) => asset.purpose === 'cover',
    );
    return {
      ...business,
      logoUrl: approvedLogo
        ? publicMediaUrl(approvedLogo.storageBucket, approvedLogo.storagePath)
        : business.logoUrl,
      coverUrl: approvedCover
        ? publicMediaUrl(approvedCover.storageBucket, approvedCover.storagePath)
        : business.coverUrl,
      lastConfirmedAt: business.lastConfirmedAt?.toISOString() ?? null,
      trust: this.trustFor(business.id, related.verifications),
      locations: related.locations.map((location) => ({
        id: location.id,
        name: location.name,
        isPrimary: location.isPrimary,
        district: location.district,
      })),
      services: related.services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        category: {
          name: service.categoryName,
          slug: service.categorySlug,
        },
        priceFrom: optionalNumber(service.priceFrom),
        priceTo: optionalNumber(service.priceTo),
        lastConfirmedAt: service.lastConfirmedAt?.toISOString() ?? null,
        fulfillment: related.options
          .filter((option) => option.businessServiceId === service.id)
          .map((option) => ({
            mode: option.mode,
            coverageScope: option.coverageScope,
            feeMinimum: optionalNumber(option.feeMinimum),
            feeMaximum: optionalNumber(option.feeMaximum),
            leadTimeMinimumDays: option.leadTimeMinimumDays,
            leadTimeMaximumDays: option.leadTimeMaximumDays,
            notes: option.notes,
            districts: related.areas
              .filter(
                (area) =>
                  area.fulfillmentOptionId === option.id && area.districtName,
              )
              .map((area) => ({
                name: area.districtName!,
                slug: area.districtSlug!,
              })),
            provinces: related.areas
              .filter(
                (area) =>
                  area.fulfillmentOptionId === option.id && area.provinceName,
              )
              .map((area) => ({
                name: area.provinceName!,
                slug: area.provinceSlug!,
              })),
          })),
      })),
      gallery: related.media
        .filter(
          (asset) =>
            asset.purpose === 'gallery' || asset.purpose === 'work_sample',
        )
        .map((asset) => this.publicMedia(asset)),
      products: related.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceFrom: optionalNumber(product.priceFrom),
        priceTo: optionalNumber(product.priceTo),
        availability: product.availability,
        media: related.media
          .filter((asset) => asset.productId === product.id)
          .map((asset) => this.publicMedia(asset)),
      })),
    };
  }

  private directoryFilters(query: PublicBusinessDirectoryQuery): SQL[] {
    const filters: SQL[] = [
      eq(businesses.status, 'active'),
      eq(businesses.reviewStatus, 'approved'),
    ];

    if (query.q) {
      const pattern = `%${query.q}%`;
      filters.push(sql`(
        ${businesses.name} ilike ${pattern}
        or coalesce(${businesses.description}, '') ilike ${pattern}
        or exists (
          select 1 from business_services search_service
          inner join categories search_category on search_category.id = search_service.category_id
          where search_service.business_id = ${businesses.id}
            and search_service.is_available = true
            and (search_service.name ilike ${pattern} or search_category.name ilike ${pattern})
        )
        or exists (
          select 1 from business_products search_product
          where search_product.business_id = ${businesses.id}
            and search_product.status = 'active'
            and search_product.is_published = true
            and (
              search_product.name ilike ${pattern}
              or coalesce(search_product.description, '') ilike ${pattern}
            )
        )
      )`);
    }

    if (query.category) {
      filters.push(sql`exists (
        select 1 from business_services category_service
        inner join categories selected_category on selected_category.id = category_service.category_id
        where category_service.business_id = ${businesses.id}
          and category_service.is_available = true
          and selected_category.slug = ${query.category}
      )`);
    }

    if (query.fulfillment) {
      filters.push(sql`exists (
        select 1 from business_services fulfillment_service
        inner join business_service_fulfillment_options selected_option
          on selected_option.business_service_id = fulfillment_service.id
        where fulfillment_service.business_id = ${businesses.id}
          and fulfillment_service.is_available = true
          and selected_option.is_active = true
          and selected_option.mode = ${query.fulfillment}
      )`);
    }

    if (query.district) {
      filters.push(this.districtFilter(query.district));
    } else if (query.province) {
      filters.push(this.provinceFilter(query.province));
    }
    return filters;
  }

  private districtFilter(districtId: string) {
    return sql`(
      exists (
        select 1 from business_locations selected_location
        inner join districts selected_district on selected_district.id = selected_location.district_id
        where selected_location.business_id = ${businesses.id}
          and selected_location.is_active = true
          and selected_district.id = ${districtId}
      )
      or exists (
        select 1 from business_services coverage_service
        inner join business_service_fulfillment_options coverage_option
          on coverage_option.business_service_id = coverage_service.id
        left join business_service_coverage_areas coverage_area
          on coverage_area.fulfillment_option_id = coverage_option.id
        left join districts coverage_district on coverage_district.id = coverage_area.district_id
        left join provinces coverage_province on coverage_province.id = coverage_area.province_id
        where coverage_service.business_id = ${businesses.id}
          and coverage_service.is_available = true
          and coverage_option.is_active = true
          and (
            coverage_option.coverage_scope in ('nationwide', 'remote')
            or coverage_district.id = ${districtId}
            or coverage_province.id = (
              select target_district.province_id from districts target_district
              where target_district.id = ${districtId}
            )
          )
      )
    )`;
  }

  private provinceFilter(slug: string) {
    return sql`(
      exists (
        select 1 from business_locations selected_location
        inner join districts location_district on location_district.id = selected_location.district_id
        inner join provinces location_province on location_province.id = location_district.province_id
        where selected_location.business_id = ${businesses.id}
          and selected_location.is_active = true
          and location_province.slug = ${slug}
      )
      or exists (
        select 1 from business_services coverage_service
        inner join business_service_fulfillment_options coverage_option
          on coverage_option.business_service_id = coverage_service.id
        left join business_service_coverage_areas coverage_area
          on coverage_area.fulfillment_option_id = coverage_option.id
        left join districts coverage_district on coverage_district.id = coverage_area.district_id
        left join provinces district_province on district_province.id = coverage_district.province_id
        left join provinces coverage_province on coverage_province.id = coverage_area.province_id
        where coverage_service.business_id = ${businesses.id}
          and coverage_service.is_available = true
          and coverage_option.is_active = true
          and (
            coverage_option.coverage_scope in ('nationwide', 'remote')
            or district_province.slug = ${slug}
            or coverage_province.slug = ${slug}
          )
      )
    )`;
  }

  private async loadRelated(businessIds: string[]) {
    const [
      locationRows,
      serviceRows,
      verificationRows,
      productRows,
      mediaRows,
    ] = await Promise.all([
      this.database.db
        .select({
          id: businessLocations.id,
          businessId: businessLocations.businessId,
          name: businessLocations.name,
          isPrimary: businessLocations.isPrimary,
          districtName: districts.name,
          districtSlug: districts.slug,
          provinceName: provinces.name,
          provinceSlug: provinces.slug,
        })
        .from(businessLocations)
        .leftJoin(districts, eq(businessLocations.districtId, districts.id))
        .leftJoin(provinces, eq(districts.provinceId, provinces.id))
        .where(
          and(
            inArray(businessLocations.businessId, businessIds),
            eq(businessLocations.isActive, true),
          ),
        )
        .orderBy(
          desc(businessLocations.isPrimary),
          asc(businessLocations.name),
        ),
      this.database.db
        .select({
          id: businessServices.id,
          businessId: businessServices.businessId,
          name: businessServices.name,
          description: businessServices.description,
          categoryName: categories.name,
          categorySlug: categories.slug,
          priceFrom: businessServices.priceFrom,
          priceTo: businessServices.priceTo,
          lastConfirmedAt: businessServices.lastConfirmedAt,
        })
        .from(businessServices)
        .innerJoin(categories, eq(businessServices.categoryId, categories.id))
        .where(
          and(
            inArray(businessServices.businessId, businessIds),
            eq(businessServices.isAvailable, true),
          ),
        )
        .orderBy(asc(businessServices.name)),
      this.database.db
        .select({
          businessId: businessVerifications.businessId,
          type: businessVerifications.type,
        })
        .from(businessVerifications)
        .where(
          and(
            inArray(businessVerifications.businessId, businessIds),
            eq(businessVerifications.status, 'verified'),
          ),
        ),
      this.database.db
        .select()
        .from(businessProducts)
        .where(
          and(
            inArray(businessProducts.businessId, businessIds),
            eq(businessProducts.status, 'active'),
            eq(businessProducts.isPublished, true),
          ),
        )
        .orderBy(asc(businessProducts.sortOrder), asc(businessProducts.name)),
      this.database.db
        .select()
        .from(businessMediaAssets)
        .where(
          and(
            inArray(businessMediaAssets.businessId, businessIds),
            eq(businessMediaAssets.moderationStatus, 'approved'),
          ),
        )
        .orderBy(
          asc(businessMediaAssets.sortOrder),
          asc(businessMediaAssets.createdAt),
        ),
    ]);

    const serviceIds = serviceRows.map((service) => service.id);
    const optionRows = serviceIds.length
      ? await this.database.db
          .select({
            id: businessServiceFulfillmentOptions.id,
            businessServiceId:
              businessServiceFulfillmentOptions.businessServiceId,
            mode: businessServiceFulfillmentOptions.mode,
            coverageScope: businessServiceFulfillmentOptions.coverageScope,
            feeMinimum: businessServiceFulfillmentOptions.feeMinimum,
            feeMaximum: businessServiceFulfillmentOptions.feeMaximum,
            leadTimeMinimumDays:
              businessServiceFulfillmentOptions.leadTimeMinimumDays,
            leadTimeMaximumDays:
              businessServiceFulfillmentOptions.leadTimeMaximumDays,
            notes: businessServiceFulfillmentOptions.notes,
          })
          .from(businessServiceFulfillmentOptions)
          .where(
            and(
              inArray(
                businessServiceFulfillmentOptions.businessServiceId,
                serviceIds,
              ),
              eq(businessServiceFulfillmentOptions.isActive, true),
            ),
          )
      : [];

    const optionIds = optionRows.map((option) => option.id);
    const areaRows = optionIds.length
      ? await this.database.db
          .select({
            fulfillmentOptionId:
              businessServiceCoverageAreas.fulfillmentOptionId,
            districtName: districts.name,
            districtSlug: districts.slug,
            provinceName: provinces.name,
            provinceSlug: provinces.slug,
          })
          .from(businessServiceCoverageAreas)
          .leftJoin(
            districts,
            eq(businessServiceCoverageAreas.districtId, districts.id),
          )
          .leftJoin(
            provinces,
            eq(businessServiceCoverageAreas.provinceId, provinces.id),
          )
          .where(
            inArray(
              businessServiceCoverageAreas.fulfillmentOptionId,
              optionIds,
            ),
          )
      : [];

    return {
      locations: locationRows.map((location) => ({
        id: location.id,
        businessId: location.businessId,
        name: location.name,
        isPrimary: location.isPrimary,
        district:
          location.districtName &&
          location.districtSlug &&
          location.provinceName &&
          location.provinceSlug
            ? {
                name: location.districtName,
                slug: location.districtSlug,
                provinceName: location.provinceName,
                provinceSlug: location.provinceSlug,
              }
            : null,
      })),
      services: serviceRows,
      options: optionRows,
      areas: areaRows,
      verifications: verificationRows,
      products: productRows,
      media: mediaRows,
    };
  }

  private publicMedia(asset: typeof businessMediaAssets.$inferSelect) {
    return {
      id: asset.id,
      productId: asset.productId,
      purpose: asset.purpose,
      url: publicMediaUrl(asset.storageBucket, asset.storagePath),
      mimeType: asset.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      fileSizeBytes: asset.fileSizeBytes,
      width: asset.width,
      height: asset.height,
      title: asset.title,
      altText: asset.altText,
      caption: asset.caption,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private trustFor(
    businessId: string,
    verifications: Array<{
      businessId: string;
      type: 'contact' | 'ownership' | 'registration';
    }>,
  ) {
    const types = new Set(
      verifications
        .filter((verification) => verification.businessId === businessId)
        .map((verification) => verification.type),
    );
    return {
      contactVerified: types.has('contact'),
      registrationVerified: types.has('registration'),
    };
  }
}
