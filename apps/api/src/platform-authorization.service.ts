import { ForbiddenException, Injectable } from '@nestjs/common';
import { eq, userRoles } from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

export type ReviewerRole = 'admin' | 'reviewer';

@Injectable()
export class PlatformAuthorizationService {
  constructor(private readonly database: DatabaseService) {}

  async requireReviewer(user: AuthenticatedUser): Promise<ReviewerRole> {
    const roles = await this.rolesFor(user);

    if (roles.includes('admin')) return 'admin';
    if (roles.includes('reviewer')) return 'reviewer';

    throw new ForbiddenException('Reviewer access is required.');
  }

  async requireAdmin(user: AuthenticatedUser): Promise<'admin'> {
    const roles = await this.rolesFor(user);
    if (roles.includes('admin')) return 'admin';

    throw new ForbiddenException('Administrator access is required.');
  }

  private async rolesFor(user: AuthenticatedUser): Promise<ReviewerRole[]> {
    const rows = await this.database.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, user.id));
    return rows.map(({ role }) => role);
  }
}
