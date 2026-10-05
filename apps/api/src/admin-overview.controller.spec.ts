import { UnauthorizedException } from '@nestjs/common';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminOverviewService } from './admin-overview.service';
import { AuthenticatedUserService } from './authenticated-user.service';

describe('AdminOverviewController', () => {
  const user = {
    id: 'b815e956-f004-4f52-9e1f-d02231119792',
    email: 'reviewer@example.com',
    emailVerifiedAt: new Date('2026-09-10T08:00:00.000Z'),
    assuranceLevel: 'aal2' as const,
  };
  const verify = jest.fn();
  const getOverview = jest.fn();
  const controller = new AdminOverviewController(
    { verify } as unknown as AuthenticatedUserService,
    { getOverview } as unknown as AdminOverviewService,
  );

  beforeEach(() => {
    verify.mockReset();
    getOverview.mockReset();
  });

  it('authenticates before loading the overview', async () => {
    verify.mockResolvedValue(user);
    getOverview.mockResolvedValue({ role: 'reviewer' });

    await expect(controller.getOverview('Bearer token')).resolves.toEqual({
      role: 'reviewer',
    });
    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(getOverview).toHaveBeenCalledWith(user);
  });

  it('does not load platform figures for an invalid session', async () => {
    verify.mockRejectedValue(new UnauthorizedException());

    await expect(controller.getOverview(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(getOverview).not.toHaveBeenCalled();
  });
});
