import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessServicesController } from './business-services.controller';
import { BusinessServicesService } from './business-services.service';

describe('BusinessServicesController', () => {
  const user = { id: 'user-id', email: 'owner@example.com' };
  const businessId = 'b69a05f3-c203-41b0-94ce-e3ab8af41771';
  const serviceId = '601fc37f-2445-4ad5-b792-2285ace4f297';
  const categoryId = 'a30ea2bf-9487-4e20-bc98-21a7beb9fe04';
  const verify = jest.fn().mockResolvedValue(user);
  const get = jest.fn().mockResolvedValue({});
  const create = jest.fn().mockResolvedValue({});
  const update = jest.fn().mockResolvedValue({});
  const controller = new BusinessServicesController(
    { verify } as unknown as AuthenticatedUserService,
    { get, create, update } as unknown as BusinessServicesService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates a validated service for an authenticated manager', async () => {
    const input = {
      categoryId,
      name: 'Emergency plumbing',
      description: 'Call-out repairs.',
      priceFrom: 250,
      isAvailable: true,
    };
    await controller.create('Bearer token', businessId, input);
    expect(create).toHaveBeenCalledWith(user, businessId, {
      ...input,
      status: 'active',
    });
  });

  it('updates availability and archive state', async () => {
    const input = {
      categoryId,
      name: 'Emergency plumbing',
      isAvailable: false,
      status: 'archived',
    };
    await controller.update('Bearer token', businessId, serviceId, input);
    expect(update).toHaveBeenCalledWith(user, businessId, serviceId, input);
  });

  it('rejects invalid pricing before authentication', async () => {
    await expect(
      controller.create('Bearer token', businessId, {
        categoryId,
        name: 'Emergency plumbing',
        priceFrom: 500,
        priceTo: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
