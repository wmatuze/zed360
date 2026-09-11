import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminLocationListQuery,
  AdminLocationStatusAction,
  SaveAdminDistrict,
  SaveAdminProvince,
} from '@zed360/contracts';
import { and, districts, eq, provinces } from '@zed360/database';
import { AdminAuditService } from './admin-audit.service';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

@Injectable()
export class AdminLocationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(viewer: AuthenticatedUser, query: AdminLocationListQuery) {
    const viewerRole = await this.authorization.requireReviewer(viewer);
    const [provinceRows, districtRows] = await Promise.all([
      this.database.client`
        select province.id, province.name, province.slug, province.is_active as "isActive",
          province.updated_at as "updatedAt",
          (select count(*)::int from districts d where d.province_id = province.id) as "districtCount",
          (select count(*)::int from districts d where d.province_id = province.id and d.is_active) as "activeDistrictCount",
          (select count(*)::int from business_service_coverage_areas a where a.province_id = province.id) as "coverageCount"
        from provinces province order by province.name`,
      this.database.client`
        select district.id, district.province_id as "provinceId", district.name, district.slug,
          district.is_active as "isActive", district.updated_at as "updatedAt",
          (select count(*)::int from business_locations l where l.district_id = district.id) as "locationCount",
          (select count(*)::int from customer_requests r where r.district_id = district.id) as "requestCount",
          (select count(*)::int from business_service_coverage_areas a where a.district_id = district.id) as "coverageCount"
        from districts district order by district.name`,
    ]);
    const needle = query.q.toLowerCase();
    const statusMatches = (active: boolean) =>
      query.status === 'all' || (query.status === 'active' ? active : !active);
    const mappedDistricts = districtRows.map((row) => ({
      id: String(row.id),
      provinceId: String(row.provinceId),
      name: String(row.name),
      slug: String(row.slug),
      isActive: Boolean(row.isActive),
      locationCount: Number(row.locationCount),
      requestCount: Number(row.requestCount),
      coverageCount: Number(row.coverageCount),
      updatedAt: new Date(row.updatedAt as string | Date).toISOString(),
    }));
    const provincesWithDistricts = provinceRows.map((row) => {
      const provinceMatches =
        !needle ||
        String(row.name).toLowerCase().includes(needle) ||
        String(row.slug).toLowerCase().includes(needle);
      const children = mappedDistricts.filter(
        (district) =>
          district.provinceId === String(row.id) &&
          statusMatches(district.isActive) &&
          (!needle ||
            provinceMatches ||
            district.name.toLowerCase().includes(needle) ||
            district.slug.toLowerCase().includes(needle)),
      );
      return {
        id: String(row.id),
        name: String(row.name),
        slug: String(row.slug),
        isActive: Boolean(row.isActive),
        districtCount: Number(row.districtCount),
        activeDistrictCount: Number(row.activeDistrictCount),
        coverageCount: Number(row.coverageCount),
        updatedAt: new Date(row.updatedAt as string | Date).toISOString(),
        districts: children,
        provinceMatches,
      };
    });
    const provincesResult = provincesWithDistricts
      .filter(
        (province) =>
          (!query.provinceId || province.id === query.provinceId) &&
          ((province.provinceMatches && statusMatches(province.isActive)) ||
            province.districts.length > 0),
      )
      .map(({ provinceMatches, ...province }) => {
        void provinceMatches;
        return province;
      });
    return {
      viewerRole,
      provinces: provincesResult,
      totalProvinces: provinceRows.length,
      totalDistricts: districtRows.length,
    };
  }

  async createProvince(viewer: AuthenticatedUser, input: SaveAdminProvince) {
    await this.authorization.requireAdmin(viewer);
    await this.ensureProvinceSlug(input.slug);
    return this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(provinces)
        .values(input)
        .returning({ id: provinces.id });
      if (!created) throw new Error('Province was not created.');
      await this.audit.record(
        {
          actorUserId: viewer.id,
          action: 'province.created',
          subjectType: 'province',
          subjectId: created.id,
          afterState: input,
        },
        tx,
      );
      return { provinceId: created.id };
    });
  }

  async updateProvince(
    viewer: AuthenticatedUser,
    id: string,
    input: SaveAdminProvince,
  ) {
    await this.authorization.requireAdmin(viewer);
    return this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(provinces)
        .where(eq(provinces.id, id))
        .limit(1)
        .for('update');
      if (!current) throw new NotFoundException('Province not found.');
      const [owner] = await tx
        .select({ id: provinces.id })
        .from(provinces)
        .where(eq(provinces.slug, input.slug))
        .limit(1);
      if (owner && owner.id !== id)
        throw new ConflictException('That province slug is already in use.');
      await tx
        .update(provinces)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(provinces.id, id));
      await this.audit.record(
        {
          actorUserId: viewer.id,
          action: 'province.updated',
          subjectType: 'province',
          subjectId: id,
          beforeState: { name: current.name, slug: current.slug },
          afterState: input,
        },
        tx,
      );
      return { provinceId: id };
    });
  }

  async changeProvinceStatus(
    viewer: AuthenticatedUser,
    id: string,
    input: AdminLocationStatusAction,
  ) {
    await this.authorization.requireAdmin(viewer);
    return this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(provinces)
        .where(eq(provinces.id, id))
        .limit(1)
        .for('update');
      if (!current) throw new NotFoundException('Province not found.');
      const active = input.action === 'activated';
      if (!active) {
        const [child] = await tx
          .select({ id: districts.id })
          .from(districts)
          .where(
            and(eq(districts.provinceId, id), eq(districts.isActive, true)),
          )
          .limit(1);
        if (child)
          throw new ConflictException(
            'Deactivate the province’s active districts first.',
          );
      }
      await tx
        .update(provinces)
        .set({ isActive: active, updatedAt: new Date() })
        .where(eq(provinces.id, id));
      await this.audit.record(
        {
          actorUserId: viewer.id,
          action: `province.${input.action}`,
          subjectType: 'province',
          subjectId: id,
          reason: input.reason,
          beforeState: { isActive: current.isActive },
          afterState: { isActive: active },
        },
        tx,
      );
      return { provinceId: id, isActive: active };
    });
  }

  async createDistrict(viewer: AuthenticatedUser, input: SaveAdminDistrict) {
    await this.authorization.requireAdmin(viewer);
    await this.requireActiveProvince(input.provinceId);
    await this.ensureDistrictSlug(input.provinceId, input.slug);
    return this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(districts)
        .values(input)
        .returning({ id: districts.id });
      if (!created) throw new Error('District was not created.');
      await this.audit.record(
        {
          actorUserId: viewer.id,
          action: 'district.created',
          subjectType: 'district',
          subjectId: created.id,
          afterState: input,
        },
        tx,
      );
      return { districtId: created.id };
    });
  }

  async updateDistrict(
    viewer: AuthenticatedUser,
    id: string,
    input: SaveAdminDistrict,
  ) {
    await this.authorization.requireAdmin(viewer);
    await this.requireActiveProvince(input.provinceId);
    return this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(districts)
        .where(eq(districts.id, id))
        .limit(1)
        .for('update');
      if (!current) throw new NotFoundException('District not found.');
      const [owner] = await tx
        .select({ id: districts.id })
        .from(districts)
        .where(
          and(
            eq(districts.provinceId, input.provinceId),
            eq(districts.slug, input.slug),
          ),
        )
        .limit(1);
      if (owner && owner.id !== id)
        throw new ConflictException(
          'That district slug is already used in this province.',
        );
      await tx
        .update(districts)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(districts.id, id));
      await this.audit.record(
        {
          actorUserId: viewer.id,
          action: 'district.updated',
          subjectType: 'district',
          subjectId: id,
          beforeState: {
            provinceId: current.provinceId,
            name: current.name,
            slug: current.slug,
          },
          afterState: input,
        },
        tx,
      );
      return { districtId: id };
    });
  }

  async changeDistrictStatus(
    viewer: AuthenticatedUser,
    id: string,
    input: AdminLocationStatusAction,
  ) {
    await this.authorization.requireAdmin(viewer);
    return this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(districts)
        .where(eq(districts.id, id))
        .limit(1)
        .for('update');
      if (!current) throw new NotFoundException('District not found.');
      const active = input.action === 'activated';
      if (active) await this.requireActiveProvince(current.provinceId);
      await tx
        .update(districts)
        .set({ isActive: active, updatedAt: new Date() })
        .where(eq(districts.id, id));
      await this.audit.record(
        {
          actorUserId: viewer.id,
          action: `district.${input.action}`,
          subjectType: 'district',
          subjectId: id,
          reason: input.reason,
          beforeState: { isActive: current.isActive },
          afterState: { isActive: active },
        },
        tx,
      );
      return { districtId: id, isActive: active };
    });
  }

  private async ensureProvinceSlug(slug: string) {
    const [row] = await this.database.db
      .select({ id: provinces.id })
      .from(provinces)
      .where(eq(provinces.slug, slug))
      .limit(1);
    if (row)
      throw new ConflictException('That province slug is already in use.');
  }
  private async ensureDistrictSlug(provinceId: string, slug: string) {
    const [row] = await this.database.db
      .select({ id: districts.id })
      .from(districts)
      .where(
        and(eq(districts.provinceId, provinceId), eq(districts.slug, slug)),
      )
      .limit(1);
    if (row)
      throw new ConflictException(
        'That district slug is already used in this province.',
      );
  }
  private async requireActiveProvince(id: string) {
    const [row] = await this.database.db
      .select({ id: provinces.id })
      .from(provinces)
      .where(and(eq(provinces.id, id), eq(provinces.isActive, true)))
      .limit(1);
    if (!row)
      throw new NotFoundException('The selected province is unavailable.');
  }
}
