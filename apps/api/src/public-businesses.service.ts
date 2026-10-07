import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  BusinessActivityEvent,
  PublicBusinessDirectory,
  PublicBusinessDirectoryQuery,
  PublicBusinessProfile,
  PublicBusinessSort,
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
  interactions,
  provinces,
  reviews,
  sql,
} from '@zed360/database';
import type { SQL } from 'drizzle-orm';
import { DatabaseService } from './database.service';
import { fromPoint } from './location-coordinates';
import { publicMediaUrl } from './media-storage';
import { describeOperatingHours, zonedDayAndMinute } from './operating-hours';

const pageSize = 30;
const DAY = 24 * 60 * 60 * 1000;

function freshness(value: Date | null, maximumAgeDays: number) {
  if (!value) return 'unconfirmed' as const;
  return Date.now() - value.getTime() <= maximumAgeDays * DAY
    ? ('current' as const)
    : ('stale' as const);
}

function optionalNumber(value: string | null) {
  return value === null ? null : Number(value);
}

// Written out in full because Drizzle drops the table name from columns
// inside a SELECT list, which would make these subqueries compare the wrong id.
const businessId = sql.raw('"businesses"."id"');

const publishedReviewCount = sql<number>`(
  select count(*)::int from reviews published_review
  where published_review.business_id = ${businessId}
    and published_review.is_published = true
)`;

const publishedAverageRating = sql<string | null>`(
  select round(avg(published_review.rating), 1) from reviews published_review
  where published_review.business_id = ${businessId}
    and published_review.is_published = true
)`;

// Ownership checks are private; only the checks shown on a profile count.
const latestVerificationAt = sql<string | null>`(
  select max(coalesce(verification.reviewed_at, verification.updated_at))
  from business_verifications verification
  where verification.business_id = ${businessId}
    and verification.status = 'verified'
    and verification.type in ('contact', 'registration')
)`;

// A plain average would put one 5-star review above fifty 4.8-star reviews.
// Each business is therefore scored as if it also held three 4-star reviews,
// so a rating has to be earned by volume as well as quality.
const RATING_PRIOR_MEAN = 4;
const RATING_PRIOR_WEIGHT = 3;
const weightedRating = sql`(
  select (coalesce(sum(published_review.rating), 0)
      + ${RATING_PRIOR_MEAN * RATING_PRIOR_WEIGHT})::numeric
    / (count(*) + ${RATING_PRIOR_WEIGHT})
  from reviews published_review
  where published_review.business_id = ${businessId}
    and published_review.is_published = true
)`;

// Popularity, not quality: an owner can raise this by visiting their own
// profile, so it is only ever shown as "most viewed", with the count.
const viewsThisWeek = sql<number>`(
  select coalesce(sum(viewed.count), 0)::int
  from business_activity_daily viewed
  where viewed.business_id = ${businessId}
    and viewed.event = 'profile_view'
    and viewed.day > (now() at time zone 'Africa/Lusaka')::date - 7
)`;

const directoryOrder: Record<PublicBusinessSort, SQL[]> = {
  most_viewed: [sql`${viewsThisWeek} desc`],
  recently_confirmed: [sql`${businesses.lastConfirmedAt} desc nulls last`],
  top_rated: [sql`${weightedRating} desc`, sql`${publishedReviewCount} desc`],
  recently_verified: [sql`${latestVerificationAt} desc nulls last`],
  newest: [desc(businesses.createdAt)],
};

@Injectable()
export class PublicBusinessesService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Adds one to today's count for a live business. Unknown or hidden
   * businesses are ignored silently so the endpoint reveals nothing.
   */
  async recordActivity(slug: string, event: BusinessActivityEvent) {
    await this.database.client`
      insert into business_activity_daily (business_id, day, event, count)
      select business.id, (now() at time zone 'Africa/Lusaka')::date,
             ${event}::business_activity_event, 1
      from businesses business
      where business.slug = ${slug}
        and business.status = 'active'
        and business.review_status = 'approved'
      on conflict (business_id, day, event)
      do update set count = business_activity_daily.count + 1
    `;
  }

  async compare(slugs: string[]) {
    return {
      businesses: await Promise.all(slugs.map((slug) => this.getProfile(slug))),
    };
  }

  async getDirectory(
    query: PublicBusinessDirectoryQuery,
  ): Promise<PublicBusinessDirectory> {
    const filters = this.directoryFilters(query);
    // "Top rated" and "recently verified" list only businesses that have
    // earned a place; they are not the whole directory re-ordered.
    if (query.sort === 'top_rated')
      filters.push(sql`${publishedReviewCount} > 0`);
    if (query.sort === 'recently_verified')
      filters.push(sql`${latestVerificationAt} is not null`);
    if (query.sort === 'most_viewed') filters.push(sql`${viewsThisWeek} > 0`);
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
          availability: businesses.availabilityStatus,
          availabilityNote: businesses.availabilityNote,
          availabilityUpdatedAt: businesses.availabilityUpdatedAt,
          joinedAt: businesses.createdAt,
          reviewCount: publishedReviewCount,
          averageRating: publishedAverageRating,
          verifiedAt: latestVerificationAt,
          viewsThisWeek,
        })
        .from(businesses)
        .where(where)
        .orderBy(...directoryOrder[query.sort], asc(businesses.name))
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
              address: primaryLocationRow.address,
              coordinates: primaryLocationRow.coordinates,
              isPrimary: primaryLocationRow.isPrimary,
              district: primaryLocationRow.district,
              operatingHours: describeOperatingHours(
                primaryLocationRow.openingHours,
                business.availability === 'temporarily_unavailable' &&
                  freshness(business.availabilityUpdatedAt, 7) === 'current',
              ),
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

        const { reviewCount, averageRating, verifiedAt, joinedAt, ...summary } =
          business;
        const temporarilyUnavailable =
          business.availability === 'temporarily_unavailable' &&
          freshness(business.availabilityUpdatedAt, 7) === 'current';
        const locationStatuses = related.locations
          .filter((location) => location.businessId === business.id)
          .map(
            (location) =>
              describeOperatingHours(
                location.openingHours,
                temporarilyUnavailable,
              ).currentStatus,
          );
        return {
          ...summary,
          openStatus: locationStatuses.includes('open')
            ? ('open' as const)
            : locationStatuses.some((status) => status !== 'unknown')
              ? ('closed' as const)
              : ('unknown' as const),
          reviewSummary: {
            reviewCount,
            averageRating:
              averageRating === null ? null : Number(averageRating),
          },
          verifiedAt: verifiedAt ? new Date(verifiedAt).toISOString() : null,
          joinedAt: joinedAt.toISOString(),
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
          availabilityUpdatedAt:
            business.availabilityUpdatedAt?.toISOString() ?? null,
          availabilityFreshness: freshness(business.availabilityUpdatedAt, 7),
          profileFreshness: freshness(business.lastConfirmedAt, 90),
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
        availability: businesses.availabilityStatus,
        availabilityNote: businesses.availabilityNote,
        availabilityUpdatedAt: businesses.availabilityUpdatedAt,
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
      availabilityUpdatedAt:
        business.availabilityUpdatedAt?.toISOString() ?? null,
      availabilityFreshness: freshness(business.availabilityUpdatedAt, 7),
      profileFreshness: freshness(business.lastConfirmedAt, 90),
      trust: this.trustFor(business.id, related.verifications),
      locations: related.locations.map((location) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        coordinates: location.coordinates,
        isPrimary: location.isPrimary,
        district: location.district,
        operatingHours: describeOperatingHours(
          location.openingHours,
          business.availability === 'temporarily_unavailable' &&
            freshness(business.availabilityUpdatedAt, 7) === 'current',
        ),
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
      reviewSummary: this.reviewSummary(
        related.reviews.filter((review) => review.businessId === business.id),
      ),
      reviews: related.reviews
        .filter((review) => review.businessId === business.id)
        .map((review) => ({
          id: review.id,
          rating: review.rating,
          body: review.body,
          createdAt: review.createdAt.toISOString(),
          verifiedInteraction: true as const,
          response: null,
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

    if (query.available) {
      // The same 7-day rule that decides what a profile shows as current.
      filters.push(sql`(
        ${businesses.availabilityStatus} = 'available'
        and ${businesses.availabilityUpdatedAt} >= now() - interval '7 days'
      )`);
    }

    if (query.open) filters.push(this.openNowFilter());
    return filters;
  }

  /**
   * Mirrors describeOperatingHours: a location is open if today's hours
   * cover the current Zambian time, or yesterday's hours run past midnight
   * and have not yet ended. Times are zero-padded "HH:MM", so comparing them
   * as text is comparing them as times.
   */
  private openNowFilter(now = new Date()): SQL {
    const { dayOfWeek, minute } = zonedDayAndMinute(now);
    const yesterday = (dayOfWeek + 6) % 7;
    const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    return sql`(
      not (
        ${businesses.availabilityStatus} = 'temporarily_unavailable'
        and ${businesses.availabilityUpdatedAt} >= now() - interval '7 days'
      )
      and exists (
        select 1 from business_locations open_location
        where open_location.business_id = ${businesses.id}
          and open_location.is_active = true
          and jsonb_typeof(open_location.opening_hours -> 'days') = 'array'
          and exists (
            select 1
            from jsonb_array_elements(open_location.opening_hours -> 'days') as schedule(day)
            where (
              (schedule.day ->> 'dayOfWeek')::int = ${dayOfWeek}
              and (
                schedule.day ->> 'status' = 'open_24_hours'
                or (
                  schedule.day ->> 'status' = 'hours'
                  and (
                    (
                      schedule.day ->> 'opensAt' < schedule.day ->> 'closesAt'
                      and ${time} >= schedule.day ->> 'opensAt'
                      and ${time} < schedule.day ->> 'closesAt'
                    )
                    or (
                      schedule.day ->> 'opensAt' > schedule.day ->> 'closesAt'
                      and ${time} >= schedule.day ->> 'opensAt'
                    )
                  )
                )
              )
            ) or (
              (schedule.day ->> 'dayOfWeek')::int = ${yesterday}
              and schedule.day ->> 'status' = 'hours'
              and schedule.day ->> 'closesAt' < schedule.day ->> 'opensAt'
              and ${time} < schedule.day ->> 'closesAt'
            )
          )
      )
    )`;
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
      reviewRows,
    ] = await Promise.all([
      this.database.db
        .select({
          id: businessLocations.id,
          businessId: businessLocations.businessId,
          name: businessLocations.name,
          address: businessLocations.address,
          coordinates: businessLocations.coordinates,
          isPrimary: businessLocations.isPrimary,
          openingHours: businessLocations.openingHours,
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
            eq(businessServices.status, 'active'),
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
      this.database.db
        .select({
          id: reviews.id,
          businessId: reviews.businessId,
          rating: reviews.rating,
          body: reviews.body,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .innerJoin(interactions, eq(reviews.interactionId, interactions.id))
        .where(
          and(
            inArray(reviews.businessId, businessIds),
            eq(reviews.moderationStatus, 'approved'),
            eq(reviews.isPublished, true),
            eq(interactions.outcomeConfirmed, true),
          ),
        )
        .orderBy(desc(reviews.createdAt)),
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
        address: location.address,
        coordinates: fromPoint(location.coordinates),
        isPrimary: location.isPrimary,
        openingHours: location.openingHours,
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
      reviews: reviewRows,
    };
  }

  private reviewSummary(reviews: Array<{ rating: number }>): {
    averageRating: number | null;
    reviewCount: number;
  } {
    if (!reviews.length) return { averageRating: null, reviewCount: 0 };
    const average =
      reviews.reduce((total, review) => total + review.rating, 0) /
      reviews.length;
    return {
      averageRating: Math.round(average * 10) / 10,
      reviewCount: reviews.length,
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
