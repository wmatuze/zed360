import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BusinessCatalog,
  CompleteBusinessMediaUpload,
  CreateBusinessMediaUploadIntent,
  SaveBusinessProduct,
} from '@zed360/contracts';
import {
  and,
  asc,
  businessMediaAssets,
  businessMembers,
  businessProducts,
  businesses,
  eq,
} from '@zed360/database';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { businessMediaBucket, publicMediaUrl } from './media-storage';

const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

function optionalNumber(value: string | null) {
  return value === null ? null : Number(value);
}

@Injectable()
export class BusinessCatalogService {
  constructor(private readonly database: DatabaseService) {}

  async getCatalog(
    user: AuthenticatedUser,
    businessId: string,
  ): Promise<BusinessCatalog> {
    const business = await this.requireManager(user, businessId);
    const products = await this.database.db
      .select()
      .from(businessProducts)
      .where(eq(businessProducts.businessId, businessId))
      .orderBy(asc(businessProducts.sortOrder), asc(businessProducts.name));
    const media = await this.database.db
      .select()
      .from(businessMediaAssets)
      .where(eq(businessMediaAssets.businessId, businessId))
      .orderBy(
        asc(businessMediaAssets.sortOrder),
        asc(businessMediaAssets.createdAt),
      );

    const mappedMedia = media.map((asset) => this.mapMedia(asset));
    return {
      business,
      bucket: businessMediaBucket(),
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceFrom: optionalNumber(product.priceFrom),
        priceTo: optionalNumber(product.priceTo),
        availability: product.availability,
        status: product.status,
        isPublished: product.isPublished,
        lastConfirmedAt: product.lastConfirmedAt?.toISOString() ?? null,
        media: mappedMedia.filter((asset) => asset.productId === product.id),
      })),
      media: mappedMedia.filter((asset) => asset.productId === null),
    };
  }

  async createProduct(
    user: AuthenticatedUser,
    businessId: string,
    product: SaveBusinessProduct,
  ) {
    await this.requireManager(user, businessId);
    await this.database.db.insert(businessProducts).values({
      businessId,
      name: product.name,
      description: product.description || undefined,
      priceFrom: product.priceFrom?.toFixed(2),
      priceTo: product.priceTo?.toFixed(2),
      availability: product.availability,
      status: product.status,
      isPublished: product.isPublished,
      lastConfirmedAt: new Date(),
    });
    return this.getCatalog(user, businessId);
  }

  async updateProduct(
    user: AuthenticatedUser,
    businessId: string,
    productId: string,
    product: SaveBusinessProduct,
  ) {
    await this.requireManager(user, businessId);
    const updated = await this.database.db
      .update(businessProducts)
      .set({
        name: product.name,
        description: product.description || null,
        priceFrom: product.priceFrom?.toFixed(2) ?? null,
        priceTo: product.priceTo?.toFixed(2) ?? null,
        availability: product.availability,
        status: product.status,
        isPublished: product.isPublished,
        lastConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessProducts.id, productId),
          eq(businessProducts.businessId, businessId),
        ),
      )
      .returning({ id: businessProducts.id });
    if (!updated.length) throw new NotFoundException('Product not found.');
    return this.getCatalog(user, businessId);
  }

  async createUploadIntent(
    user: AuthenticatedUser,
    businessId: string,
    upload: CreateBusinessMediaUploadIntent,
  ) {
    await this.requireManager(user, businessId);
    if (upload.productId) {
      await this.requireProduct(businessId, upload.productId);
    }
    return {
      bucket: businessMediaBucket(),
      path: `${businessId}/${randomUUID()}.${extensions[upload.mimeType]}`,
    };
  }

  async completeUpload(
    user: AuthenticatedUser,
    businessId: string,
    media: CompleteBusinessMediaUpload,
  ) {
    await this.requireManager(user, businessId);
    if (media.productId) await this.requireProduct(businessId, media.productId);

    const extension = extensions[media.mimeType];
    const expectedPath = new RegExp(
      `^${businessId}/[0-9a-f-]{36}\\.${extension}$`,
      'i',
    );
    if (!expectedPath.test(media.storagePath)) {
      throw new ForbiddenException('The uploaded image path is invalid.');
    }

    await this.database.db.insert(businessMediaAssets).values({
      businessId,
      productId: media.productId,
      purpose: media.purpose,
      storageBucket: businessMediaBucket(),
      storagePath: media.storagePath,
      mimeType: media.mimeType,
      fileSizeBytes: media.fileSizeBytes,
      width: media.width,
      height: media.height,
      title: media.title || undefined,
      altText: media.altText,
      caption: media.caption || undefined,
      moderationStatus: 'pending',
    });
    return this.getCatalog(user, businessId);
  }

  private async requireProduct(businessId: string, productId: string) {
    const [product] = await this.database.db
      .select({ id: businessProducts.id })
      .from(businessProducts)
      .where(
        and(
          eq(businessProducts.id, productId),
          eq(businessProducts.businessId, businessId),
        ),
      )
      .limit(1);
    if (!product) throw new NotFoundException('Product not found.');
  }

  private async requireManager(user: AuthenticatedUser, businessId: string) {
    const [membership] = await this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
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
    if (!membership) throw new NotFoundException('Business not found.');
    if (membership.role === 'staff') {
      throw new ForbiddenException(
        'An owner or manager is required to manage the catalog.',
      );
    }
    return { id: membership.id, name: membership.name };
  }

  private mapMedia(asset: typeof businessMediaAssets.$inferSelect) {
    return {
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
    };
  }
}
