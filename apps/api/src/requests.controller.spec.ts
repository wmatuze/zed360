import { BadRequestException } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

describe('RequestsController', () => {
  const create = jest.fn();
  const controller = new RequestsController({
    create,
  } as unknown as RequestsService);

  beforeEach(() => {
    create.mockReset();
  });

  it('passes a valid request to the service', async () => {
    const body = {
      summary: 'I need a solar installer for a three-bedroom house',
      categoryId: 'dfaa1f8f-f66e-4af1-b093-60db594c62a0',
      districtId: '2f509151-995a-4df4-a63a-3a5d65b487d8',
      timing: 'this_week',
      budgetMinimum: 1000,
      budgetMaximum: 3000,
    };
    create.mockResolvedValue({ id: 'request-id' });

    await controller.create(body);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: body.summary,
        timing: body.timing,
        categoryAnswers: {},
      }),
    );
  });

  it('rejects malformed request data before reaching the service', () => {
    expect(() => controller.create({ summary: 'Too short' })).toThrow(
      BadRequestException,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('requires a date when specific-date timing is selected', () => {
    expect(() =>
      controller.create({
        summary: 'I need a solar installer for a three-bedroom house',
        categoryId: 'dfaa1f8f-f66e-4af1-b093-60db594c62a0',
        districtId: '2f509151-995a-4df4-a63a-3a5d65b487d8',
        timing: 'specific_date',
      }),
    ).toThrow(BadRequestException);
  });
});
