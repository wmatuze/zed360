import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessOperatingHoursController } from './business-operating-hours.controller';
import { BusinessOperatingHoursService } from './business-operating-hours.service';

describe('BusinessOperatingHoursController', () => {
  const user = { id: 'user-id', email: 'owner@example.com' };
  const businessId = 'b69a05f3-c203-41b0-94ce-e3ab8af41771';
  const locationId = '601fc37f-2445-4ad5-b792-2285ace4f297';
  const verify = jest.fn().mockResolvedValue(user);
  const get = jest.fn().mockResolvedValue({});
  const updateLocation = jest.fn().mockResolvedValue({});
  const controller = new BusinessOperatingHoursController(
    { verify } as unknown as AuthenticatedUserService,
    { get, updateLocation } as unknown as BusinessOperatingHoursService,
  );

  beforeEach(() => {
    verify.mockClear();
    get.mockClear();
    updateLocation.mockClear();
  });

  it('authenticates before loading operating hours', async () => {
    await controller.get('Bearer token', businessId);
    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(get).toHaveBeenCalledWith(user, businessId);
  });

  it('validates and saves all seven days for one location', async () => {
    const body = {
      days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        status: 'closed',
      })),
    };
    await controller.updateLocation(
      'Bearer token',
      businessId,
      locationId,
      body,
    );
    expect(updateLocation).toHaveBeenCalledWith(
      user,
      businessId,
      locationId,
      body,
    );
  });

  it('rejects a duplicate day before authentication', async () => {
    await expect(
      controller.updateLocation('Bearer token', businessId, locationId, {
        days: Array.from({ length: 7 }, () => ({
          dayOfWeek: 1,
          status: 'closed',
        })),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
