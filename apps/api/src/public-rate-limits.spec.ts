import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ContentReportsController } from './content-reports.controller';
import { ContentReportsService } from './content-reports.service';
import { AuthenticatedUserService } from './authenticated-user.service';
import { publicRateLimits, throttlerOptions } from './public-rate-limits';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

describe('public rate limits', () => {
  let app: INestApplication<App>;
  const create = jest.fn();
  const getSharedRequest = jest.fn();
  const submitReport = jest.fn();

  beforeEach(async () => {
    create.mockReset().mockResolvedValue({ id: 'request-id' });
    getSharedRequest.mockReset().mockResolvedValue({});
    submitReport.mockReset().mockResolvedValue({ id: 'report-id' });
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(throttlerOptions)],
      controllers: [RequestsController, ContentReportsController],
      providers: [
        { provide: RequestsService, useValue: { create, getSharedRequest } },
        { provide: ContentReportsService, useValue: { submit: submitReport } },
        { provide: AuthenticatedUserService, useValue: {} },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const validRequest = {
    categoryId: 'ef7e5e78-5c1d-49b8-87aa-296145c2fc05',
    districtId: 'ef7e5e78-5c1d-49b8-87aa-296145c2fc06',
    summary: 'Need a plumber to fix a leaking kitchen pipe',
    timing: 'this_week',
  };

  it('rejects customer requests beyond the per-minute burst', async () => {
    const { burst } = publicRateLimits.customerRequest;
    for (let attempt = 0; attempt < burst; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/requests')
        .send(validRequest);
      expect(response.status).not.toBe(429);
    }

    const blocked = await request(app.getHttpServer())
      .post('/requests')
      .send(validRequest);
    expect(blocked.status).toBe(429);
    expect((blocked.body as { message?: string }).message).toMatch(
      /Too many attempts/,
    );
    expect(blocked.headers['retry-after-burst']).toBeDefined();
  });

  it('keeps content reports to five per hour', async () => {
    const report = {
      targetType: 'business',
      targetId: 'ef7e5e78-5c1d-49b8-87aa-296145c2fc05',
      reason: 'misleading',
      details: 'The public description contains information that is outdated.',
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/content-reports')
        .send(report)
        .expect(201);
    }
    await request(app.getHttpServer())
      .post('/content-reports')
      .send(report)
      .expect(429);
    expect(submitReport).toHaveBeenCalledTimes(5);
  });

  it('does not limit public read routes', async () => {
    const token = '0b6d6e0e-3c2a-4b8e-9a8f-1f2e3d4c5b6a';
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await request(app.getHttpServer())
        .get(`/requests/shared/${token}`)
        .expect(200);
    }
  });
});
