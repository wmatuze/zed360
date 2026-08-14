import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessPresenceController } from './business-presence.controller';
import { BusinessPresenceService } from './business-presence.service';

describe('BusinessPresenceController', () => {
  const businessId = 'ef7e5e78-5c1d-49b8-87aa-296145c2fc05';
  const user = {
    id: 'user-id',
    email: 'owner@example.com',
    emailVerifiedAt: new Date(),
  };

  it('authenticates and validates availability before updating it', async () => {
    const verify = jest.fn().mockResolvedValue(user);
    const updateAvailability = jest.fn().mockResolvedValue({});
    const controller = new BusinessPresenceController(
      { verify } as unknown as AuthenticatedUserService,
      { updateAvailability } as unknown as BusinessPresenceService,
    );

    await controller.updateAvailability('Bearer token', businessId, {
      availability: 'busy',
      note: 'Replying within one business day.',
    });

    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(updateAvailability).toHaveBeenCalledWith(user, businessId, {
      availability: 'busy',
      note: 'Replying within one business day.',
    });
  });

  it('authenticates a profile confirmation', async () => {
    const verify = jest.fn().mockResolvedValue(user);
    const confirmProfile = jest.fn().mockResolvedValue({});
    const controller = new BusinessPresenceController(
      { verify } as unknown as AuthenticatedUserService,
      { confirmProfile } as unknown as BusinessPresenceService,
    );

    await controller.confirmProfile('Bearer token', businessId);

    expect(confirmProfile).toHaveBeenCalledWith(user, businessId);
  });
});
