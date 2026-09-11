import { BadRequestException } from '@nestjs/common';
import { AdminLocationsController } from './admin-locations.controller';
import { AdminLocationsService } from './admin-locations.service';
import { AuthenticatedUserService } from './authenticated-user.service';

describe('AdminLocationsController', () => {
  const user = { id: 'user-id', email: 'admin@example.com' };
  const id = 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07';
  const verify = jest.fn();
  const service = {
    list: jest.fn(),
    createProvince: jest.fn(),
    updateProvince: jest.fn(),
    changeProvinceStatus: jest.fn(),
    createDistrict: jest.fn(),
    updateDistrict: jest.fn(),
    changeDistrictStatus: jest.fn(),
  };
  const controller = new AdminLocationsController(
    { verify } as unknown as AuthenticatedUserService,
    service as unknown as AdminLocationsService,
  );
  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    Object.values(service).forEach((mock) =>
      mock.mockReset().mockResolvedValue({}),
    );
  });

  it('loads validated filters', async () => {
    await controller.list('Bearer token', { q: 'Lusaka', status: 'active' });
    expect(service.list).toHaveBeenCalledWith(user, {
      q: 'Lusaka',
      status: 'active',
    });
  });
  it('updates a valid district', async () => {
    const input = { provinceId: id, name: 'Lusaka', slug: 'lusaka' };
    await controller.updateDistrict('Bearer token', id, input);
    expect(service.updateDistrict).toHaveBeenCalledWith(user, id, input);
  });
  it('rejects a status change without a clear reason', async () => {
    await expect(
      controller.provinceStatus('Bearer token', id, {
        action: 'deactivated',
        reason: 'short',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
