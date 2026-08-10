import { ForbiddenException, Injectable } from '@nestjs/common';
import { eq, userRoles } from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

export type ReviewerRole = 'admin' | 'reviewer';

@Injectable()
export class PlatformAuthorizationService {
  constructor(private readonly database: DatabaseService) {}

  async requireReviewer(user: AuthenticatedUser): Promise<ReviewerRole> {
    const roles = await this.database.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, user.id));

    if (roles.some(({ role }) => role === 'admin')) return 'admin';
    if (roles.some(({ role }) => role === 'reviewer')) return 'reviewer';

    throw new ForbiddenException('Reviewer access is required.');
  }
}
