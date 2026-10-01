import { BadRequestException } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { AuthenticatedUserService } from './authenticated-user.service';

describe('AdminCategoriesController', () => {
  const user = { id: 'user-id', email: 'admin@example.com' };
  const categoryId = 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07';
  const verify = jest.fn();
  const list = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const changeStatus = jest.fn();
  const controller = new AdminCategoriesController(
    { verify } as unknown as AuthenticatedUserService,
    { list, create, update, changeStatus } as unknown as AdminCategoriesService,
  );

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    list.mockReset().mockResolvedValue({ categories: [] });
    create.mockReset().mockResolvedValue({ categoryId });
    update.mockReset().mockResolvedValue({ categoryId });
    changeStatus.mockReset().mockResolvedValue({ categoryId });
  });

  it('loads a validated category query', async () => {
    await controller.list('Bearer token', { q: 'energy', status: 'active' });
    expect(list).toHaveBeenCalledWith(user, {
      q: 'energy',
      status: 'active',
    });
  });

  it('passes valid category details to the service', async () => {
    const input = {
      name: 'Solar installation',
      slug: 'solar-installation',
      description: '',
      parentId: null,
      sortOrder: 20,
    };
    await controller.update('Bearer token', categoryId, input);
    expect(update).toHaveBeenCalledWith(user, categoryId, input);
  });

  it('rejects an invalid status change before authentication', async () => {
    await expect(
      controller.changeStatus('Bearer token', categoryId, {
        action: 'deactivated',
        reason: 'short',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
