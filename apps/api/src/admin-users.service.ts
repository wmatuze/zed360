import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminUserAction,
  AdminUserList,
  AdminUserListQuery,
} from '@zed360/contracts';
import { adminAuditEvents, and, eq, userRoles, users } from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

type PlatformRole = 'admin' | 'reviewer';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
  ) {}

  async list(
    viewer: AuthenticatedUser,
    query: AdminUserListQuery,
  ): Promise<AdminUserList> {
    await this.authorization.requireAdmin(viewer);
    const pattern = `%${query.q}%`;
    const filter = query.q
      ? this.database.client`
          where coalesce(platform_user.display_name, '') ilike ${pattern}
             or coalesce(platform_user.email, '') ilike ${pattern}
             or coalesce(platform_user.phone, '') ilike ${pattern}
        `
      : this.database.client``;
    const offset = (query.page - 1) * query.pageSize;
    const [rows, totals] = await Promise.all([
      this.database.client`
        select platform_user.id,
               platform_user.display_name as "displayName",
               platform_user.email,
               platform_user.phone,
               platform_user.account_status as "accountStatus",
               platform_user.status_reason as "statusReason",
               platform_user.created_at as "createdAt",
               coalesce(
                 array_agg(distinct assigned_role.role)
                   filter (where assigned_role.role is not null),
                 array[]::platform_role[]
               ) as roles,
               count(distinct membership.business_id)::int as "businessCount"
        from users platform_user
        left join user_roles assigned_role on assigned_role.user_id = platform_user.id
        left join business_members membership on membership.user_id = platform_user.id
        ${filter}
        group by platform_user.id
        order by platform_user.created_at desc
        limit ${query.pageSize} offset ${offset}
      `,
      this.database.client`
        select count(*)::int as total
        from users platform_user
        ${filter}
      `,
    ]);
    const total = Number(totals[0]?.total ?? 0);

    return {
      viewerRole: 'admin',
      users: rows.map((row) => ({
        id: String(row.id),
        displayName:
          typeof row.displayName === 'string' ? row.displayName : null,
        email: typeof row.email === 'string' ? row.email : null,
        phone: typeof row.phone === 'string' ? row.phone : null,
        accountStatus:
          row.accountStatus === 'suspended' ? 'suspended' : 'active',
        statusReason:
          typeof row.statusReason === 'string' ? row.statusReason : null,
        roles: Array.isArray(row.roles)
          ? row.roles.filter(
              (role): role is PlatformRole =>
                role === 'admin' || role === 'reviewer',
            )
          : [],
        businessCount: Number(row.businessCount ?? 0),
        createdAt: new Date(row.createdAt as string | Date).toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
  }

  async act(
    viewer: AuthenticatedUser,
    userId: string,
    action: AdminUserAction,
  ) {
    await this.authorization.requireAdmin(viewer);
    return this.database.db.transaction(async (transaction) => {
      const [target] = await transaction
        .select({
          id: users.id,
          accountStatus: users.accountStatus,
          statusReason: users.statusReason,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .for('update');
      if (!target) throw new NotFoundException('User not found.');

      const currentRoleRows = await transaction
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, userId));
      const currentRoles = currentRoleRows.map(({ role }) => role);

      if (
        (action.action === 'suspended' ||
          (action.action === 'role_revoked' && action.role === 'admin')) &&
        currentRoles.includes('admin')
      ) {
        const administrators = await transaction
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .innerJoin(users, eq(userRoles.userId, users.id))
          .where(
            and(eq(userRoles.role, 'admin'), eq(users.accountStatus, 'active')),
          )
          .for('update');
        if (!administrators.some(({ userId: id }) => id !== userId)) {
          throw new ConflictException(
            'The final active administrator cannot be suspended or demoted.',
          );
        }
      }

      const now = new Date();
      if (action.action === 'role_granted') {
        await transaction
          .insert(userRoles)
          .values({
            userId,
            role: action.role,
            grantedByUserId: viewer.id,
          })
          .onConflictDoNothing();
      } else if (action.action === 'role_revoked') {
        await transaction
          .delete(userRoles)
          .where(
            and(eq(userRoles.userId, userId), eq(userRoles.role, action.role)),
          );
      } else {
        await transaction
          .update(users)
          .set({
            accountStatus:
              action.action === 'suspended' ? 'suspended' : 'active',
            statusReason: action.action === 'suspended' ? action.reason : null,
            statusChangedAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, userId));
      }

      const resultingRoles =
        action.action === 'role_granted'
          ? [...new Set([...currentRoles, action.role])]
          : action.action === 'role_revoked'
            ? currentRoles.filter((role) => role !== action.role)
            : currentRoles;
      const resultingStatus =
        action.action === 'suspended'
          ? 'suspended'
          : action.action === 'reinstated'
            ? 'active'
            : target.accountStatus;

      await transaction.insert(adminAuditEvents).values({
        actorUserId: viewer.id,
        action: `user.${action.action}`,
        subjectType: 'user',
        subjectId: userId,
        reason: action.reason,
        beforeState: {
          accountStatus: target.accountStatus,
          statusReason: target.statusReason,
          roles: currentRoles,
        },
        afterState: {
          accountStatus: resultingStatus,
          statusReason: action.action === 'suspended' ? action.reason : null,
          roles: resultingRoles,
        },
      });

      return {
        userId,
        accountStatus: resultingStatus,
        roles: resultingRoles,
        updatedAt: now.toISOString(),
      };
    });
  }
}
