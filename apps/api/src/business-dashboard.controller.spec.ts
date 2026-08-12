import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessDashboardController } from './business-dashboard.controller';
import { BusinessDashboardService } from './business-dashboard.service';

describe('BusinessDashboardController', () => {
  it('authenticates before loading the dashboard', async () => {
    const user = {
      id: 'user-id',
      email: 'owner@example.com',
      emailVerifiedAt: new Date(),
    };
    const verify = jest.fn().mockResolvedValue(user);
    const getDashboard = jest.fn().mockResolvedValue({ businesses: [] });
    const controller = new BusinessDashboardController(
      { verify } as unknown as AuthenticatedUserService,
      { getDashboard } as unknown as BusinessDashboardService,
    );

    await controller.getDashboard('Bearer token');

    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(getDashboard).toHaveBeenCalledWith(user);
  });
});
