import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessServiceCoverageController } from './business-service-coverage.controller';
import { BusinessServiceCoverageService } from './business-service-coverage.service';

describe('BusinessServiceCoverageController', () => {
  const user = {
    id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
    email: 'owner@example.com',
    emailVerifiedAt: new Date('2026-08-10T08:00:00.000Z'),
  };
  const businessId = 'e872475b-72a2-4f99-a065-f87aa19c00ee';
  const serviceId = '601fc37f-2445-4ad5-b792-2285ace4f297';
  const verify = jest.fn();
  const getCoverage = jest.fn();
  const replaceServiceCoverage = jest.fn();
  const controller = new BusinessServiceCoverageController(
    { verify } as unknown as AuthenticatedUserService,
    {
      getCoverage,
      replaceServiceCoverage,
    } as unknown as BusinessServiceCoverageService,
  );

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    getCoverage.mockReset().mockResolvedValue({});
    replaceServiceCoverage.mockReset().mockResolvedValue({});
  });

  it('authenticates before loading service coverage', async () => {
    await controller.getCoverage('Bearer access-token', businessId);
    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(getCoverage).toHaveBeenCalledWith(user, businessId);
  });

  it('validates and sends a nationwide delivery option', async () => {
    const body = {
      options: [
        {
          mode: 'delivery',
          coverageScope: 'nationwide',
          feeMinimum: 50,
          leadTimeMinimumDays: 1,
          leadTimeMaximumDays: 5,
        },
      ],
    };
    await controller.replaceServiceCoverage(
      'Bearer access-token',
      businessId,
      serviceId,
      body,
    );
    expect(replaceServiceCoverage).toHaveBeenCalledWith(
      user,
      businessId,
      serviceId,
      expect.objectContaining({
        options: [expect.objectContaining(body.options[0])],
      }),
    );
  });

  it('rejects selected districts when none are chosen', async () => {
    await expect(
      controller.replaceServiceCoverage(
        'Bearer access-token',
        businessId,
        serviceId,
        {
          options: [
            {
              mode: 'delivery',
              coverageScope: 'selected_districts',
              districtIds: [],
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
