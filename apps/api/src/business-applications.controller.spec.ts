import { BadRequestException } from '@nestjs/common';
import { BusinessApplicationsController } from './business-applications.controller';
import { BusinessApplicationsService } from './business-applications.service';

describe('BusinessApplicationsController', () => {
  const create = jest.fn();
  const controller = new BusinessApplicationsController({
    create,
  } as unknown as BusinessApplicationsService);

  beforeEach(() => create.mockReset());

  it('passes a valid draft business application to the service', async () => {
    const body = {
      businessName: 'Copperbelt Solar Care',
      description: 'Residential solar installation and maintenance.',
      categoryId: 'dfaa1f8f-f66e-4af1-b093-60db594c62a0',
      serviceName: 'Solar installation',
      districtId: '2f509151-995a-4df4-a63a-3a5d65b487d8',
      phone: '+260 97 000 0000',
      registrationStatus: 'not_registered',
      representativeConfirmed: true,
    };
    create.mockResolvedValue({ id: 'business-id', status: 'draft' });

    await controller.create(body);

    expect(create).toHaveBeenCalledWith(expect.objectContaining(body));
  });

  it('requires registry details when PACRA registration is claimed', () => {
    expect(() =>
      controller.create({
        businessName: 'Copperbelt Solar Care',
        categoryId: 'dfaa1f8f-f66e-4af1-b093-60db594c62a0',
        serviceName: 'Solar installation',
        districtId: '2f509151-995a-4df4-a63a-3a5d65b487d8',
        phone: '+260 97 000 0000',
        registrationStatus: 'registered',
        representativeConfirmed: true,
      }),
    ).toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('requires a contact method and representative confirmation', () => {
    expect(() =>
      controller.create({
        businessName: 'Copperbelt Solar Care',
        categoryId: 'dfaa1f8f-f66e-4af1-b093-60db594c62a0',
        serviceName: 'Solar installation',
        districtId: '2f509151-995a-4df4-a63a-3a5d65b487d8',
      }),
    ).toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });
});
