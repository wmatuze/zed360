import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateBusinessApplication } from '@zed360/contracts';
import {
  and,
  businessLocations,
  businesses,
  businessServices,
  businessVerifications,
  categories,
  customerRequests,
  districts,
  eq,
  requestMatches,
} from '@zed360/database';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DatabaseService } from './database.service';

function businessSlug(name: string) {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

  return `${base || 'business'}-${randomUUID().slice(0, 8)}`;
}

@Injectable()
export class BusinessApplicationsService {
  constructor(private readonly database: DatabaseService) {}

  async create(application: CreateBusinessApplication) {
    const claimToken = randomBytes(32).toString('base64url');
    const claimTokenHash = createHash('sha256')
      .update(claimToken)
      .digest('hex');
    const [[category], [district]] = await Promise.all([
      this.database.db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, application.categoryId),
            eq(categories.isActive, true),
          ),
        )
        .limit(1),
      this.database.db
        .select({ id: districts.id })
        .from(districts)
        .where(eq(districts.id, application.districtId))
        .limit(1),
    ]);

    if (!category) {
      throw new NotFoundException('The selected category is unavailable.');
    }
    if (!district) {
      throw new NotFoundException('The selected district is unavailable.');
    }

    const created = await this.database.db.transaction(async (transaction) => {
      const [business] = await transaction
        .insert(businesses)
        .values({
          name: application.businessName,
          slug: businessSlug(application.businessName),
          description: application.description || undefined,
          status: 'draft',
          phone: application.phone || undefined,
          whatsapp: application.whatsapp || undefined,
          email: application.email?.toLowerCase() || undefined,
          website: application.website || undefined,
        })
        .returning({
          id: businesses.id,
          status: businesses.status,
          createdAt: businesses.createdAt,
        });

      if (!business) {
        throw new Error('The business application could not be created.');
      }

      const registrationDeclaration = {
        status: application.registrationStatus,
        registeredLegalName: application.registeredLegalName,
        registrationNumber: application.registrationNumber,
        entityType: application.entityType,
      };

      const relatedRecords = [
        transaction.insert(businessLocations).values({
          businessId: business.id,
          districtId: application.districtId,
          name: 'Primary service area',
          address: application.address || undefined,
          isPrimary: true,
        }),
        transaction.insert(businessServices).values({
          businessId: business.id,
          categoryId: application.categoryId,
          name: application.serviceName,
        }),
        transaction.insert(businessVerifications).values({
          businessId: business.id,
          type: 'ownership',
          status: 'pending',
          evidence: {
            source: 'business_application_self_attestation',
            representativeConfirmed: application.representativeConfirmed,
            registrationDeclaration,
            claimTokenHash,
            submittedAt: new Date().toISOString(),
          },
        }),
      ];

      if (application.registrationStatus === 'registered') {
        relatedRecords.push(
          transaction.insert(businessVerifications).values({
            businessId: business.id,
            type: 'registration',
            status: 'pending',
            evidence: {
              source: 'business_application_declaration',
              registeredLegalName: application.registeredLegalName,
              registrationNumber: application.registrationNumber,
              entityType: application.entityType,
              submittedAt: new Date().toISOString(),
            },
          }),
        );
      }

      await Promise.all(relatedRecords);

      const openRequests = await transaction
        .select({ id: customerRequests.id })
        .from(customerRequests)
        .where(
          and(
            eq(customerRequests.status, 'open'),
            eq(customerRequests.categoryId, application.categoryId),
            eq(customerRequests.districtId, application.districtId),
          ),
        );

      if (openRequests.length > 0) {
        await transaction
          .insert(requestMatches)
          .values(
            openRequests.map((request) => ({
              requestId: request.id,
              businessId: business.id,
              status: 'queued' as const,
              score: '0.800',
              reasons: [
                'category_exact',
                'district_exact',
                'business_pending_review',
              ],
            })),
          )
          .onConflictDoNothing();
      }

      return business;
    });

    return {
      ...created,
      status: 'draft' as const,
      createdAt: created.createdAt.toISOString(),
      claimToken,
    };
  }
}
