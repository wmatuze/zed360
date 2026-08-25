import { ContentReportsService } from './content-reports.service';

describe('ContentReportsService', () => {
  it('serializes report timestamps returned as database strings', async () => {
    const database = {
      client: jest.fn().mockResolvedValue([
        {
          id: '04f98e8e-30d7-44b5-99ca-ee9b14f75ea4',
          targetType: 'business',
          targetId: '0cbb7a2e-50f4-453d-a3e8-d581ca8dc23f',
          targetLabel: 'Example business',
          reason: 'misleading',
          details: 'The public information appears to be inaccurate.',
          reporterEmail: null,
          createdAt: '2026-08-25 22:45:24.244+00',
        },
      ]),
    };
    const authorization = {
      requireReviewer: jest.fn().mockResolvedValue('admin'),
    };
    const service = new ContentReportsService(
      database as never,
      authorization as never,
    );

    await expect(
      service.list({
        id: '69458279-5563-4023-bc73-03361789435f',
        email: 'admin@example.com',
        emailVerifiedAt: new Date(),
      }),
    ).resolves.toEqual({
      viewerRole: 'admin',
      reports: [
        expect.objectContaining({
          createdAt: '2026-08-25T22:45:24.244Z',
        }),
      ],
    });
  });
});
