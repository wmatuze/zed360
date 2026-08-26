import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessLocationsController } from './business-locations.controller';
import { BusinessLocationsService } from './business-locations.service';

describe('BusinessLocationsController', () => {
  const user = { id: 'user-id', email: 'owner@example.com' };
  const businessId = 'b69a05f3-c203-41b0-94ce-e3ab8af41771';
  const locationId = '601fc37f-2445-4ad5-b792-2285ace4f297';
  const districtId = 'a30ea2bf-9487-4e20-bc98-21a7beb9fe04';
  const verify = jest.fn().mockResolvedValue(user);
  const get = jest.fn().mockResolvedValue({});
  const create = jest.fn().mockResolvedValue({});
  const update = jest.fn().mockResolvedValue({});
  const makePrimary = jest.fn().mockResolvedValue({});
  const setStatus = jest.fn().mockResolvedValue({});
  const controller = new BusinessLocationsController(
    { verify } as unknown as AuthenticatedUserService,
    {
      get,
      create,
      update,
      makePrimary,
      setStatus,
    } as unknown as BusinessLocationsService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('authenticates before loading locations', async () => {
    await controller.get('Bearer token', businessId);
    expect(get).toHaveBeenCalledWith(user, businessId);
  });

  it('validates and creates a location', async () => {
    const body = { name: 'Lusaka branch', districtId, address: 'Cairo Road' };
    await controller.create('Bearer token', businessId, body);
    expect(create).toHaveBeenCalledWith(user, businessId, body);
  });

  it('rejects an invalid status before authentication', async () => {
    await expect(
      controller.setStatus('Bearer token', businessId, locationId, {
        isActive: 'yes',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
