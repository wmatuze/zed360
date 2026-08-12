import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BusinessProfileDecision,
  BusinessProfileManagement,
  SaveBusinessProfile,
} from '@zed360/contracts';
import {
  and,
  businessMembers,
  businessProfileRevisions,
  businesses,
  desc,
  eq,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

const nullable = (value?: string) => value || null;

@Injectable()
export class BusinessProfileManagementService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
  ) {}

  async get(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessProfileManagement> {
    const business = await this.requireManager(user, businessId);
    const revisions = await this.database.db
      .select()
      .from(businessProfileRevisions)
      .where(eq(businessProfileRevisions.businessId, businessId))
      .orderBy(desc(businessProfileRevisions.createdAt))
      .limit(2);
    const pending = revisions.find(({ status }) => status === 'pending');
    const decided = revisions.find(({ status }) => status !== 'pending');
    return {
      business: { id: business.id, name: business.name, slug: business.slug },
      current: {
        description: business.description,
        phone: business.phone,
        whatsapp: business.whatsapp,
        email: business.email,
        website: business.website,
      },
      pending: pending
        ? {
            id: pending.id,
            proposed: pending.proposed,
            createdAt: pending.createdAt.toISOString(),
          }
        : null,
      latestDecision: decided
        ? {
            status: decided.status as 'approved' | 'rejected',
            note: decided.reviewNote,
          }
        : null,
    };
  }

  async submit(
    user: AuthenticatedUser,
    businessId: string,
    profile: SaveBusinessProfile,
  ) {
    await this.requireManager(user, businessId);
    const proposed = {
      description: nullable(profile.description),
      phone: nullable(profile.phone),
      whatsapp: nullable(profile.whatsapp),
      email: nullable(profile.email),
      website: nullable(profile.website),
    };
    const [existing] = await this.database.db
      .select({ id: businessProfileRevisions.id })
      .from(businessProfileRevisions)
      .where(
        and(
          eq(businessProfileRevisions.businessId, businessId),
          eq(businessProfileRevisions.status, 'pending'),
        ),
      )
      .limit(1);
    if (existing) {
      await this.database.db
        .update(businessProfileRevisions)
        .set({ proposed, submittedByUserId: user.id, updatedAt: new Date() })
        .where(eq(businessProfileRevisions.id, existing.id));
    } else {
      await this.database.db
        .insert(businessProfileRevisions)
        .values({ businessId, submittedByUserId: user.id, proposed });
    }
    return this.get(user, businessId);
  }

  async list(user: AuthenticatedUser) {
    const viewerRole = await this.authorization.requireReviewer(user);
    const revisions = await this.database.db
      .select({
        id: businessProfileRevisions.id,
        businessId: businesses.id,
        businessName: businesses.name,
        proposed: businessProfileRevisions.proposed,
        createdAt: businessProfileRevisions.createdAt,
        description: businesses.description,
        phone: businesses.phone,
        whatsapp: businesses.whatsapp,
        email: businesses.email,
        website: businesses.website,
      })
      .from(businessProfileRevisions)
      .innerJoin(
        businesses,
        eq(businessProfileRevisions.businessId, businesses.id),
      )
      .where(eq(businessProfileRevisions.status, 'pending'))
      .orderBy(businessProfileRevisions.createdAt);
    return {
      viewerRole,
      revisions: revisions.map((revision) => ({
        ...revision,
        current: {
          description: revision.description,
          phone: revision.phone,
          whatsapp: revision.whatsapp,
          email: revision.email,
          website: revision.website,
        },
        createdAt: revision.createdAt.toISOString(),
      })),
    };
  }

  async decide(
    user: AuthenticatedUser,
    revisionId: string,
    decision: BusinessProfileDecision,
  ) {
    await this.authorization.requireReviewer(user);
    await this.database.db.transaction(async (transaction) => {
      const [revision] = await transaction
        .select()
        .from(businessProfileRevisions)
        .where(
          and(
            eq(businessProfileRevisions.id, revisionId),
            eq(businessProfileRevisions.status, 'pending'),
          ),
        )
        .limit(1);
      if (!revision)
        throw new NotFoundException(
          'This profile update is no longer awaiting review.',
        );
      if (decision.decision === 'approved') {
        await transaction
          .update(businesses)
          .set({
            ...revision.proposed,
            lastConfirmedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(businesses.id, revision.businessId));
      }
      await transaction
        .update(businessProfileRevisions)
        .set({
          status: decision.decision,
          reviewNote: decision.note || null,
          reviewedByUserId: user.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(businessProfileRevisions.id, revisionId));
    });
    return { success: true };
  }

  private async requireManager(user: AuthenticatedUser, businessId: string) {
    const [row] = await this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        description: businesses.description,
        phone: businesses.phone,
        whatsapp: businesses.whatsapp,
        email: businesses.email,
        website: businesses.website,
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
    if (!row) throw new NotFoundException('This business is unavailable.');
    if (row.role === 'staff')
      throw new ForbiddenException(
        'An owner or manager is required to edit this profile.',
      );
    return row;
  }
}
