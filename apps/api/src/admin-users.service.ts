import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminUserAction,
  AdminUserDetail,
  AdminUserList,
  AdminUserListQuery,
} from '@zed360/contracts';
import {
  adminAuditEvents,
  and,
  eq,
  inArray,
  sql,
  userRoles,
  users,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

type PlatformRole = 'admin' | 'reviewer';

const conflict = (code: string, message: string) =>
  new ConflictException({ message, code });

const isUniqueViolation = (error: unknown) =>
  [error, (error as { cause?: unknown } | null)?.cause].some(
    (candidate) =>
      typeof candidate === 'object' &&
      candidate !== null &&
      (candidate as { code?: unknown }).code === '23505',
  );

/** The single role that differs between two audited role lists, if any. */
export function changedRole(before: unknown, after: unknown) {
  const roles = (value: unknown) =>
    Array.isArray(value)
      ? value.filter(
          (role): role is PlatformRole =>
            role === 'admin' || role === 'reviewer',
        )
      : [];
  const [previous, next] = [roles(before), roles(after)];
  const changed = [
    ...next.filter((role) => !previous.includes(role)),
    ...previous.filter((role) => !next.includes(role)),
  ];
  return changed.length === 1 ? changed[0] : null;
}

function toUser(
  row: Record<string, unknown>,
  authenticatorUserIds: Set<string> | null,
) {
  const id = String(row.id);
  return {
    id,
    username: typeof row.username === 'string' ? row.username : null,
    displayName: typeof row.displayName === 'string' ? row.displayName : null,
    email: typeof row.email === 'string' ? row.email : null,
    phone: typeof row.phone === 'string' ? row.phone : null,
    accountStatus:
      row.accountStatus === 'suspended'
        ? ('suspended' as const)
        : ('active' as const),
    statusReason:
      typeof row.statusReason === 'string' ? row.statusReason : null,
    roles: Array.isArray(row.roles)
      ? row.roles.filter(
          (role): role is PlatformRole =>
            role === 'admin' || role === 'reviewer',
        )
      : [],
    businessCount: Number(row.businessCount ?? 0),
    hasAuthenticator: authenticatorUserIds
      ? authenticatorUserIds.has(id)
      : null,
    createdAt: new Date(row.createdAt as string | Date).toISOString(),
  };
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
  ) {}

  async getSignInIdentity(username: string) {
    const [eligibleUser] = await this.database.db
      .select({ email: users.email })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .where(
        and(
          sql`lower(${users.username}) = ${username.trim().toLowerCase()}`,
          eq(users.accountStatus, 'active'),
          inArray(userRoles.role, ['admin', 'reviewer']),
        ),
      )
      .limit(1);
    return { email: eligibleUser?.email ?? null };
  }

  async list(
    viewer: AuthenticatedUser,
    query: AdminUserListQuery,
  ): Promise<AdminUserList> {
    await this.authorization.requireAdmin(viewer);
    const client = this.database.client;
    const pattern = `%${query.q}%`;
    const conditions = [client`true`];
    if (query.q) {
      conditions.push(client`(
        coalesce(platform_user.display_name, '') ilike ${pattern}
        or coalesce(platform_user.username, '') ilike ${pattern}
        or coalesce(platform_user.email, '') ilike ${pattern}
        or coalesce(platform_user.phone, '') ilike ${pattern}
      )`);
    }
    if (query.status !== 'all') {
      conditions.push(
        client`platform_user.account_status = ${query.status}::user_account_status`,
      );
    }
    if (query.role === 'team') {
      conditions.push(client`exists (
        select 1 from user_roles filter_role
        where filter_role.user_id = platform_user.id
      )`);
    } else if (query.role === 'none') {
      conditions.push(client`not exists (
        select 1 from user_roles filter_role
        where filter_role.user_id = platform_user.id
      )`);
    } else if (query.role !== 'all') {
      conditions.push(client`exists (
        select 1 from user_roles filter_role
        where filter_role.user_id = platform_user.id
          and filter_role.role = ${query.role}::platform_role
      )`);
    }
    const where = conditions.reduce(
      (combined, condition) => client`${combined} and ${condition}`,
    );
    const offset = (query.page - 1) * query.pageSize;
    const [rows, totals, counts] = await Promise.all([
      client`
        select platform_user.id,
               platform_user.username,
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
        where ${where}
        group by platform_user.id
        order by platform_user.created_at desc
        limit ${query.pageSize} offset ${offset}
      `,
      client`
        select count(*)::int as total
        from users platform_user
        where ${where}
      `,
      client`
        select count(*)::int as everyone,
          count(*) filter (where exists (
            select 1 from user_roles team_role
            where team_role.user_id = platform_user.id
          ))::int as team,
          count(*) filter (
            where platform_user.account_status = 'suspended'
          )::int as suspended
        from users platform_user
      `,
    ]);
    const total = Number(totals[0]?.total ?? 0);
    const authenticators = await this.authenticatorUserIds(
      rows.map((row) => String(row.id)),
    );

    return {
      viewerRole: 'admin',
      viewerId: viewer.id,
      users: rows.map((row) => toUser(row, authenticators)),
      counts: {
        everyone: Number(counts[0]?.everyone ?? 0),
        team: Number(counts[0]?.team ?? 0),
        suspended: Number(counts[0]?.suspended ?? 0),
      },
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
  }

  async get(
    viewer: AuthenticatedUser,
    userId: string,
  ): Promise<AdminUserDetail> {
    await this.authorization.requireAdmin(viewer);
    const client = this.database.client;
    const [rows, businesses, history] = await Promise.all([
      client`
        select platform_user.id,
               platform_user.username,
               platform_user.display_name as "displayName",
               platform_user.email,
               platform_user.phone,
               platform_user.account_status as "accountStatus",
               platform_user.status_reason as "statusReason",
               platform_user.created_at as "createdAt",
               coalesce((
                 select array_agg(assigned_role.role order by assigned_role.role)
                 from user_roles assigned_role
                 where assigned_role.user_id = platform_user.id
               ), array[]::platform_role[]) as roles,
               (select count(*)::int from business_members membership
                 where membership.user_id = platform_user.id) as "businessCount"
        from users platform_user
        where platform_user.id = ${userId}
      `,
      client`
        select business.id, business.name, business.slug,
               business.status, business.review_status as "reviewStatus",
               membership.role
        from business_members membership
        inner join businesses business on business.id = membership.business_id
        where membership.user_id = ${userId}
        order by business.name
      `,
      client`
        select event.id, event.action, event.reason,
               event.before_state -> 'roles' as "rolesBefore",
               event.after_state -> 'roles' as "rolesAfter",
               event.created_at as "createdAt",
               coalesce(actor.display_name, actor.username, actor.email, 'Unknown') as actor
        from admin_audit_events event
        left join users actor on actor.id = event.actor_user_id
        where event.subject_type = 'user' and event.subject_id = ${userId}
        order by event.created_at desc
        limit 25
      `,
    ]);
    if (!rows[0]) throw new NotFoundException('User not found.');
    const authenticators = await this.authenticatorUserIds([userId]);

    return {
      viewerId: viewer.id,
      user: toUser(rows[0], authenticators),
      businesses: businesses.map((business) => ({
        id: String(business.id),
        name: String(business.name),
        slug: String(business.slug),
        status:
          business.status as AdminUserDetail['businesses'][number]['status'],
        reviewStatus:
          business.reviewStatus as AdminUserDetail['businesses'][number]['reviewStatus'],
        role: business.role as AdminUserDetail['businesses'][number]['role'],
      })),
      history: history.map((event) => ({
        id: String(event.id),
        action: String(event.action),
        role: changedRole(event.rolesBefore, event.rolesAfter),
        reason: typeof event.reason === 'string' ? event.reason : null,
        actor: String(event.actor),
        createdAt: new Date(event.createdAt as string | Date).toISOString(),
      })),
    };
  }

  async act(
    viewer: AuthenticatedUser,
    userId: string,
    action: AdminUserAction,
  ) {
    await this.authorization.requireAdmin(viewer);
    // Removing your own authority or second factor must involve another
    // administrator, so a compromised or mistaken session cannot do it alone.
    if (
      viewer.id === userId &&
      (action.action === 'suspended' ||
        action.action === 'authenticator_reset' ||
        (action.action === 'role_revoked' && action.role === 'admin'))
    ) {
      throw conflict(
        'self-action',
        'Ask another administrator to change your own access.',
      );
    }

    try {
      return await this.database.db.transaction(async (transaction) => {
        const [target] = await transaction
          .select({
            id: users.id,
            username: users.username,
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
              and(
                eq(userRoles.role, 'admin'),
                eq(users.accountStatus, 'active'),
              ),
            )
            .for('update');
          if (!administrators.some(({ userId: id }) => id !== userId)) {
            throw conflict(
              'last-admin',
              'The final active administrator cannot be suspended or demoted.',
            );
          }
        }

        const now = new Date();
        let username = target.username;
        let factorsRemoved = 0;
        if (action.action === 'role_granted') {
          // Team members sign in with a username, so the first role needs one.
          if (!target.username) {
            if (!action.username) {
              throw conflict(
                'username-required',
                'Choose a sign-in username for this team member.',
              );
            }
            username = action.username;
            await transaction
              .update(users)
              .set({ username, updatedAt: now })
              .where(eq(users.id, userId));
          }
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
              and(
                eq(userRoles.userId, userId),
                eq(userRoles.role, action.role),
              ),
            );
        } else if (action.action === 'authenticator_reset') {
          const removed = await transaction.execute(
            sql`delete from auth.mfa_factors where user_id = ${userId} returning id`,
          );
          factorsRemoved = removed.length;
          // Existing sessions were confirmed with the lost device; end them.
          await transaction.execute(
            sql`delete from auth.sessions where user_id = ${userId}`,
          );
        } else {
          await transaction
            .update(users)
            .set({
              accountStatus:
                action.action === 'suspended' ? 'suspended' : 'active',
              statusReason:
                action.action === 'suspended' ? action.reason : null,
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
        const resultingReason =
          action.action === 'suspended'
            ? action.reason
            : action.action === 'reinstated'
              ? null
              : target.statusReason;

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
            username: target.username,
          },
          afterState: {
            accountStatus: resultingStatus,
            statusReason: resultingReason,
            roles: resultingRoles,
            username,
          },
          metadata:
            action.action === 'authenticator_reset' ? { factorsRemoved } : {},
        });

        return {
          userId,
          accountStatus: resultingStatus,
          roles: resultingRoles,
          updatedAt: now.toISOString(),
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(
          'username-taken',
          'That username already belongs to another team member.',
        );
      }
      throw error;
    }
  }

  /**
   * Supabase keeps authenticator factors in its own schema. A database
   * without that schema (plain local PostgreSQL) reports "unknown" instead of
   * failing the whole screen.
   */
  private async authenticatorUserIds(userIds: string[]) {
    if (userIds.length === 0) return new Set<string>();
    try {
      const rows = await this.database.client`
        select distinct user_id from auth.mfa_factors
        where status = 'verified' and user_id in ${this.database.client(userIds)}
      `;
      return new Set(rows.map((row) => String(row.user_id)));
    } catch {
      return null;
    }
  }
}
