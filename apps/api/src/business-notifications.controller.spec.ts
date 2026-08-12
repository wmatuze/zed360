import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessNotificationsController } from './business-notifications.controller';
import { BusinessNotificationsService } from './business-notifications.service';

describe('BusinessNotificationsController', () => {
  const user = { id: 'user-id', email: 'owner@example.com' };
  const verify = jest.fn();
  const list = jest.fn();
  const markRead = jest.fn();
  const markAllRead = jest.fn();
  const controller = new BusinessNotificationsController(
    { verify } as unknown as AuthenticatedUserService,
    { list, markRead, markAllRead } as unknown as BusinessNotificationsService,
  );

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    list.mockReset().mockResolvedValue({});
    markRead.mockReset().mockResolvedValue({});
    markAllRead.mockReset().mockResolvedValue({});
  });

  it('lists only after verifying the signed-in user', async () => {
    await controller.list('Bearer token');
    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(list).toHaveBeenCalledWith(user);
  });

  it('marks one valid notification as read for that user', async () => {
    const notificationId = 'b69a05f3-c203-41b0-94ce-e3ab8af41771';
    await controller.markRead('Bearer token', notificationId);
    expect(markRead).toHaveBeenCalledWith(user, notificationId);
  });

  it('rejects a malformed notification id before authentication', async () => {
    await expect(
      controller.markRead('Bearer token', 'invalid'),
    ).rejects.toThrow(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
