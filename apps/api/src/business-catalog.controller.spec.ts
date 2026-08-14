import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessCatalogController } from './business-catalog.controller';
import { BusinessCatalogService } from './business-catalog.service';

describe('BusinessCatalogController', () => {
  const user = {
    id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
    email: 'owner@example.com',
    emailVerifiedAt: new Date(),
  };
  const verify = jest.fn();
  const getCatalog = jest.fn();
  const createProduct = jest.fn();
  const updateProduct = jest.fn();
  const createUploadIntent = jest.fn();
  const completeUpload = jest.fn();
  const removeMedia = jest.fn();
  const controller = new BusinessCatalogController(
    { verify } as unknown as AuthenticatedUserService,
    {
      getCatalog,
      createProduct,
      updateProduct,
      createUploadIntent,
      completeUpload,
      removeMedia,
    } as unknown as BusinessCatalogService,
  );
  const businessId = 'ef7e5e78-5c1d-49b8-87aa-296145c2fc05';

  beforeEach(() => {
    jest.clearAllMocks();
    verify.mockResolvedValue(user);
  });

  it('authorizes a valid display-only product', async () => {
    const product = {
      name: 'Safety boots',
      description: 'Steel-toe work boots.',
      priceFrom: 850,
      availability: 'available',
      isPublished: true,
    };
    await controller.createProduct('Bearer token', businessId, product);
    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(createProduct).toHaveBeenCalledWith(user, businessId, {
      ...product,
      status: 'active',
    });
  });

  it('rejects oversized uploads before authentication', async () => {
    await expect(
      controller.createUploadIntent('Bearer token', businessId, {
        fileName: 'large.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 6 * 1024 * 1024,
        purpose: 'gallery',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('requires product images to reference a product', async () => {
    await expect(
      controller.completeUpload('Bearer token', businessId, {
        storagePath: `${businessId}/e0ca3364-73a6-4268-8e30-6e358d4a6d2a.jpg`,
        mimeType: 'image/jpeg',
        fileSizeBytes: 1000,
        purpose: 'product',
        altText: 'Brown safety boot',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('authenticates an owner before removing business media', async () => {
    const mediaId = 'e0ca3364-73a6-4268-8e30-6e358d4a6d2a';
    await controller.removeMedia('Bearer token', businessId, mediaId);
    expect(removeMedia).toHaveBeenCalledWith(
      user,
      businessId,
      mediaId,
      'Bearer token',
    );
  });
});
