import { BadRequestException } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

describe('RequestsController', () => {
  const create = jest.fn();
  const getSharedRequest = jest.fn();
  const recordOutcome = jest.fn();
  const controller = new RequestsController({
    create,
    getSharedRequest,
    recordOutcome,
  } as unknown as RequestsService);

  beforeEach(() => {
    create.mockReset();
    getSharedRequest.mockReset().mockResolvedValue({});
    recordOutcome.mockReset().mockResolvedValue({});
  });

  it('loads a request using a valid private share token', async () => {
    const shareToken = '84854378-4d60-43a4-b53c-f7ee9c2f291e';

    await controller.getSharedRequest(shareToken);

    expect(getSharedRequest).toHaveBeenCalledWith(shareToken);
  });

  it('rejects a malformed private share token', () => {
    expect(() => controller.getSharedRequest('not-a-token')).toThrow(
      BadRequestException,
    );
    expect(getSharedRequest).not.toHaveBeenCalled();
  });

  it('records a valid customer choice using the private share token', async () => {
    const shareToken = '84854378-4d60-43a4-b53c-f7ee9c2f291e';
    const action = {
      action: 'chosen',
      matchId: 'b69a05f3-c203-41b0-94ce-e3ab8af41771',
    };

    await controller.recordOutcome(shareToken, action);

    expect(recordOutcome).toHaveBeenCalledWith(shareToken, action);
  });

  it('rejects an invalid customer outcome before reaching the service', () => {
    expect(() =>
      controller.recordOutcome('84854378-4d60-43a4-b53c-f7ee9c2f291e', {
        action: 'chosen',
      }),
    ).toThrow(BadRequestException);
    expect(recordOutcome).not.toHaveBeenCalled();
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
