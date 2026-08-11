import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminMediaReviewQueue,
  SubmitMediaReview,
} from '@zed360/contracts';
import {
  and,
  asc,
  businessMediaAssets,
  businessProducts,
  businesses,
  eq,
  sql,
} from '@zed360/database';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { publicMediaUrl } from './media-storage';
import { PlatformAuthorizationService } from './platform-authorization.service';

@Injectable()
export class MediaReviewsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
  ) {}

  async list(user: AuthenticatedUser): Promise<AdminMediaReviewQueue> {
    const viewerRole = await this.authorization.requireReviewer(user);
    const rows = await this.database.db
      .select({
        asset: businessMediaAssets,
        businessId: businesses.id,
        businessName: businesses.name,
        productName: businessProducts.name,
      })
      .from(businessMediaAssets)
      .innerJoin(businesses, eq(businessMediaAssets.businessId, businesses.id))
      .leftJoin(
        businessProducts,
        eq(businessMediaAssets.productId, businessProducts.id),
      )
      .where(eq(businessMediaAssets.moderationStatus, 'pending'))
      .orderBy(asc(businessMediaAssets.createdAt));

    return {
      viewerRole,
      media: rows.map(({ asset, businessId, businessName, productName }) => ({
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
        moderationStatus: asset.moderationStatus,
        moderationNote: asset.moderationNote,
        createdAt: asset.createdAt.toISOString(),
        business: { id: businessId, name: businessName },
        productName,
      })),
    };
  }

  async decide(
    user: AuthenticatedUser,
    mediaId: string,
    review: SubmitMediaReview,
  ): Promise<AdminMediaReviewQueue> {
    await this.authorization.requireReviewer(user);
    const [asset] = await this.database.db
      .select({
        id: businessMediaAssets.id,
        businessId: businessMediaAssets.businessId,
        purpose: businessMediaAssets.purpose,
        moderationStatus: businessMediaAssets.moderationStatus,
      })
      .from(businessMediaAssets)
      .where(eq(businessMediaAssets.id, mediaId))
      .limit(1);
    if (!asset) throw new NotFoundException('Media not found.');
    if (asset.moderationStatus !== 'pending') {
      throw new ConflictException('This image has already been reviewed.');
    }

    const now = new Date();
    await this.database.db.transaction(async (transaction) => {
      if (
        review.decision === 'approved' &&
        (asset.purpose === 'logo' || asset.purpose === 'cover')
      ) {
        await transaction
          .update(businessMediaAssets)
          .set({
            moderationStatus: 'rejected',
            moderationNote: 'Replaced by a newer approved image.',
            reviewedByUserId: user.id,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(businessMediaAssets.businessId, asset.businessId),
              eq(businessMediaAssets.purpose, asset.purpose),
              eq(businessMediaAssets.moderationStatus, 'approved'),
              sql`${businessMediaAssets.id} <> ${asset.id}`,
            ),
          );
      }
      await transaction
        .update(businessMediaAssets)
        .set({
          moderationStatus: review.decision,
          moderationNote: review.note || null,
          reviewedByUserId: user.id,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(businessMediaAssets.id, asset.id));
    });
    return this.list(user);
  }
}
