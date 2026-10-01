import { ForbiddenException, Injectable } from '@nestjs/common';
import { eq, userRoles } from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

export type ReviewerRole = 'admin' | 'reviewer';

export const mfaRequiredCode = 'mfa_required';

@Injectable()
export class PlatformAuthorizationService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Resolves the platform role without requiring a second factor. Only the
   * access check uses this, so sign-in can route reviewers to MFA.
   */
  async reviewerRole(user: AuthenticatedUser): Promise<ReviewerRole> {
    const roles = await this.rolesFor(user);

    if (roles.includes('admin')) return 'admin';
    if (roles.includes('reviewer')) return 'reviewer';

    throw new ForbiddenException('Reviewer access is required.');
  }

  async requireReviewer(user: AuthenticatedUser): Promise<ReviewerRole> {
    const role = await this.reviewerRole(user);
    this.requireSecondFactor(user);
    return role;
  }

  async requireAdmin(user: AuthenticatedUser): Promise<'admin'> {
    const roles = await this.rolesFor(user);
    if (!roles.includes('admin')) {
      throw new ForbiddenException('Administrator access is required.');
    }
    this.requireSecondFactor(user);
    return 'admin';
  }

  private requireSecondFactor(user: AuthenticatedUser) {
    if (user.assuranceLevel !== 'aal2') {
      throw new ForbiddenException({
        message: 'Confirm your authenticator code to continue.',
        code: mfaRequiredCode,
      });
    }
  }

  private async rolesFor(user: AuthenticatedUser): Promise<ReviewerRole[]> {
    const rows = await this.database.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, user.id));
    return rows.map(({ role }) => role);
  }
}
