import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminCategoryList,
  AdminCategoryListQuery,
  AdminCategoryStatusAction,
  SaveAdminCategory,
} from '@zed360/contracts';
import { and, categories, eq, isNull } from '@zed360/database';
import { AdminAuditService } from './admin-audit.service';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

@Injectable()
export class AdminCategoriesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(
    viewer: AuthenticatedUser,
    query: AdminCategoryListQuery,
  ): Promise<AdminCategoryList> {
    const viewerRole = await this.authorization.requireReviewer(viewer);
    const pattern = `%${query.q}%`;
    const filter = this.database.client`
      where (${query.q} = ''
        or category.name ilike ${pattern}
        or category.slug ilike ${pattern}
        or coalesce(parent.name, '') ilike ${pattern})
        and (${query.status} = 'all'
          or (${query.status} = 'active' and category.is_active = true)
          or (${query.status} = 'inactive' and category.is_active = false))
    `;

    const [rows, [totals], parentRows] = await Promise.all([
      this.database.client`
        select category.id,
               category.parent_id as "parentId",
               parent.name as "parentName",
               category.name,
               category.slug,
               category.description,
               category.is_active as "isActive",
               category.sort_order as "sortOrder",
               category.created_at as "createdAt",
               category.updated_at as "updatedAt",
               (select count(*)::int from categories child
                 where child.parent_id = category.id) as "childCount",
               (select count(*)::int from categories child
                 where child.parent_id = category.id and child.is_active = true)
                 as "activeChildCount",
               (select count(*)::int from business_services service
                 where service.category_id = category.id) as "serviceCount",
               (select count(*)::int from customer_requests request
                 where request.category_id = category.id) as "requestCount"
        from categories category
        left join categories parent on parent.id = category.parent_id
        ${filter}
        order by coalesce(parent.sort_order, category.sort_order),
                 coalesce(parent.name, category.name),
                 case when category.parent_id is null then 0 else 1 end,
                 category.sort_order,
                 category.name
      `,
      this.database.client`
        select count(*)::int as total,
               count(*) filter (where is_active = true)::int as active,
               count(*) filter (where is_active = false)::int as inactive
        from categories
      `,
      this.database.db
        .select({
          id: categories.id,
          name: categories.name,
          isActive: categories.isActive,
        })
        .from(categories)
        .where(isNull(categories.parentId))
        .orderBy(categories.sortOrder, categories.name),
    ]);

    return {
      viewerRole,
      categories: rows.map((row) => ({
        id: String(row.id),
        parentId: typeof row.parentId === 'string' ? row.parentId : null,
        parentName: typeof row.parentName === 'string' ? row.parentName : null,
        name: String(row.name),
        slug: String(row.slug),
        description:
          typeof row.description === 'string' ? row.description : null,
        isActive: Boolean(row.isActive),
        sortOrder: Number(row.sortOrder),
        childCount: Number(row.childCount),
        activeChildCount: Number(row.activeChildCount),
        serviceCount: Number(row.serviceCount),
        requestCount: Number(row.requestCount),
        createdAt: new Date(row.createdAt as string | Date).toISOString(),
        updatedAt: new Date(row.updatedAt as string | Date).toISOString(),
      })),
      parents: parentRows.map((parent) => ({
        id: parent.id,
        name: parent.name,
        isActive: parent.isActive,
      })),
      total: Number(totals?.total ?? 0),
      active: Number(totals?.active ?? 0),
      inactive: Number(totals?.inactive ?? 0),
    };
  }

  async create(viewer: AuthenticatedUser, input: SaveAdminCategory) {
    await this.authorization.requireAdmin(viewer);
    await this.requireAvailableSlug(input.slug);
    if (input.parentId) await this.requireValidParent(input.parentId);

    return this.database.db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(categories)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description || null,
          parentId: input.parentId,
          sortOrder: input.sortOrder,
        })
        .returning({ id: categories.id });
      if (!created) throw new Error('The category was not created.');

      await this.audit.record(
        {
          actorUserId: viewer.id,
          action: 'category.created',
          subjectType: 'category',
          subjectId: created.id,
          afterState: input,
        },
        transaction,
      );
      return { categoryId: created.id };
    });
  }

  async update(
    viewer: AuthenticatedUser,
    categoryId: string,
    input: SaveAdminCategory,
  ) {
    await this.authorization.requireAdmin(viewer);
    return this.database.db.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1)
        .for('update');
      if (!current) throw new NotFoundException('Category not found.');
      if (input.parentId === categoryId) {
        throw new ConflictException('A category cannot be its own parent.');
      }

      const [slugOwner] = await transaction
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, input.slug))
        .limit(1);
      if (slugOwner && slugOwner.id !== categoryId) {
        throw new ConflictException('That category slug is already in use.');
      }

      if (input.parentId) {
        const [parent] = await transaction
          .select({
            parentId: categories.parentId,
            isActive: categories.isActive,
          })
          .from(categories)
          .where(eq(categories.id, input.parentId))
          .limit(1);
        if (!parent) throw new NotFoundException('Parent category not found.');
        if (parent.parentId) {
          throw new ConflictException('Categories support only two levels.');
        }
        if (!parent.isActive && current.isActive) {
          throw new ConflictException(
            'An active category cannot belong to an inactive parent.',
          );
        }
        const [child] = await transaction
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.parentId, categoryId))
          .limit(1);
        if (child) {
          throw new ConflictException(
            'A category with children cannot become a subcategory.',
          );
        }
      }

      await transaction
        .update(categories)
        .set({
          name: input.name,
          slug: input.slug,
          description: input.description || null,
          parentId: input.parentId,
          sortOrder: input.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, categoryId));

      await this.audit.record(
        {
          actorUserId: viewer.id,
          action: 'category.updated',
          subjectType: 'category',
          subjectId: categoryId,
          beforeState: {
            name: current.name,
            slug: current.slug,
            description: current.description,
            parentId: current.parentId,
            sortOrder: current.sortOrder,
          },
          afterState: input,
        },
        transaction,
      );
      return { categoryId };
    });
  }

  async changeStatus(
    viewer: AuthenticatedUser,
    categoryId: string,
    input: AdminCategoryStatusAction,
  ) {
    await this.authorization.requireAdmin(viewer);
    return this.database.db.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1)
        .for('update');
      if (!current) throw new NotFoundException('Category not found.');

      const nextActive = input.action === 'activated';
      if (!nextActive && current.parentId === null) {
        const [activeChild] = await transaction
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.parentId, categoryId),
              eq(categories.isActive, true),
            ),
          )
          .limit(1);
        if (activeChild) {
          throw new ConflictException(
            'Deactivate this category’s active subcategories first.',
          );
        }
      }
      if (nextActive && current.parentId) {
        const [parent] = await transaction
          .select({ isActive: categories.isActive })
          .from(categories)
          .where(eq(categories.id, current.parentId))
          .limit(1);
        if (!parent?.isActive) {
          throw new ConflictException('Activate the parent category first.');
        }
      }

      await transaction
        .update(categories)
        .set({ isActive: nextActive, updatedAt: new Date() })
        .where(eq(categories.id, categoryId));
      await this.audit.record(
        {
          actorUserId: viewer.id,
          action: `category.${input.action}`,
          subjectType: 'category',
          subjectId: categoryId,
          reason: input.reason,
          beforeState: { isActive: current.isActive },
          afterState: { isActive: nextActive },
        },
        transaction,
      );
      return { categoryId, isActive: nextActive };
    });
  }

  private async requireAvailableSlug(slug: string) {
    const [existing] = await this.database.db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    if (existing) {
      throw new ConflictException('That category slug is already in use.');
    }
  }

  private async requireValidParent(parentId: string) {
    const [parent] = await this.database.db
      .select({ parentId: categories.parentId, isActive: categories.isActive })
      .from(categories)
      .where(eq(categories.id, parentId))
      .limit(1);
    if (!parent) throw new NotFoundException('Parent category not found.');
    if (parent.parentId) {
      throw new ConflictException('Categories support only two levels.');
    }
    if (!parent.isActive) {
      throw new ConflictException('Activate the parent category first.');
    }
  }
}
