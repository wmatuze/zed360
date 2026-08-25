import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUserService } from './authenticated-user.service';
import { ContentReportsController } from './content-reports.controller';
import { ContentReportsService } from './content-reports.service';

describe('ContentReportsController', () => {
  const submit = jest.fn();
  const list = jest.fn();
  const decide = jest.fn();
  const verify = jest.fn();
  const controller = new ContentReportsController(
    { verify } as unknown as AuthenticatedUserService,
    { submit, list, decide } as unknown as ContentReportsService,
  );
  const request = {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    submit.mockResolvedValue({ id: 'report-id', status: 'open' });
  });

  it('accepts a valid anonymous business report', async () => {
    const report = {
      targetType: 'business' as const,
      targetId: 'ef7e5e78-5c1d-49b8-87aa-296145c2fc05',
      reason: 'misleading' as const,
      details: 'The public description contains information that is outdated.',
      reporterEmail: '',
      website: '' as const,
    };
    await controller.submit(request, report);
    expect(submit).toHaveBeenCalledWith(report, '127.0.0.1');
  });

  it('rejects a report without enough detail', () => {
    expect(() =>
      controller.submit(request, {
        targetType: 'business',
        targetId: 'ef7e5e78-5c1d-49b8-87aa-296145c2fc05',
        reason: 'other',
        details: 'Bad',
      }),
    ).toThrow(BadRequestException);
    expect(submit).not.toHaveBeenCalled();
  });
});
