import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessProfileManagementController } from './business-profile-management.controller';
import { BusinessProfileManagementService } from './business-profile-management.service';

describe('BusinessProfileManagementController', () => {
  const user = { id: 'user-id', email: 'owner@example.com' };
  const verify = jest.fn().mockResolvedValue(user);
  const get = jest.fn().mockResolvedValue({});
  const submit = jest.fn().mockResolvedValue({});
  const list = jest.fn().mockResolvedValue({});
  const decide = jest.fn().mockResolvedValue({});
  const controller = new BusinessProfileManagementController(
    { verify } as unknown as AuthenticatedUserService,
    {
      get,
      submit,
      list,
      decide,
    } as unknown as BusinessProfileManagementService,
  );
  const businessId = 'b69a05f3-c203-41b0-94ce-e3ab8af41771';

  it('authenticates an owner before loading a profile', async () => {
    await controller.get('Bearer token', businessId);
    expect(get).toHaveBeenCalledWith(user, businessId);
  });

  it('rejects an invalid business id', async () => {
    await expect(controller.get('Bearer token', 'invalid')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('validates a profile update before submitting it', async () => {
    await controller.submit('Bearer token', businessId, {
      email: 'public@example.com',
      website: 'https://example.com',
    });
    expect(submit).toHaveBeenCalledWith(
      user,
      businessId,
      expect.objectContaining({ email: 'public@example.com' }),
    );
  });
});
