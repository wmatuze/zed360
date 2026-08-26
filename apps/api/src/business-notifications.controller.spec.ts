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
  const archive = jest.fn();
  const restore = jest.fn();
  const archiveAllRead = jest.fn();
  const controller = new BusinessNotificationsController(
    { verify } as unknown as AuthenticatedUserService,
    {
      list,
      markRead,
      markAllRead,
      archive,
      restore,
      archiveAllRead,
    } as unknown as BusinessNotificationsService,
  );

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    list.mockReset().mockResolvedValue({});
    markRead.mockReset().mockResolvedValue({});
    markAllRead.mockReset().mockResolvedValue({});
    archive.mockReset().mockResolvedValue({});
    restore.mockReset().mockResolvedValue({});
    archiveAllRead.mockReset().mockResolvedValue({});
  });

  it('lists only after verifying the signed-in user', async () => {
    await controller.list('Bearer token');
    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(list).toHaveBeenCalledWith(user, { view: 'inbox', page: 1 });
  });

  it('lists an archived page after validating the query', async () => {
    await controller.list('Bearer token', 'archived', '2');
    expect(list).toHaveBeenCalledWith(user, { view: 'archived', page: 2 });
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

  it('archives one valid notification for the signed-in user', async () => {
    const notificationId = 'b69a05f3-c203-41b0-94ce-e3ab8af41771';
    await controller.archive('Bearer token', notificationId);
    expect(archive).toHaveBeenCalledWith(user, notificationId);
  });

  it('restores one valid notification for the signed-in user', async () => {
    const notificationId = 'b69a05f3-c203-41b0-94ce-e3ab8af41771';
    await controller.restore('Bearer token', notificationId);
    expect(restore).toHaveBeenCalledWith(user, notificationId);
  });

  it('archives all read notifications for the signed-in user', async () => {
    await controller.archiveAllRead('Bearer token');
    expect(archiveAllRead).toHaveBeenCalledWith(user);
  });

  it('rejects an invalid notification view before authentication', async () => {
    await expect(
      controller.list('Bearer token', 'deleted', '1'),
    ).rejects.toThrow(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
