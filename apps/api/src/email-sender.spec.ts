import { EmailSendError, ResendEmailSender } from './email-sender';

describe('ResendEmailSender', () => {
  const original = { ...process.env };
  const fetchMock = jest.fn();
  const message = {
    to: 'owner@example.com',
    subject: 'New matched request',
    text: 'Plain',
    html: '<p>Rich</p>',
    idempotencyKey: 'zed360-notification-1',
  };
  const reply = (status: number, body: unknown) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    process.env.EMAIL_PROVIDER_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'Zed360 <alerts@zed360.example>';
  });

  afterAll(() => {
    process.env = original;
  });

  it('is off until both the key and the sender address are set', () => {
    expect(new ResendEmailSender().configured).toBe(true);
    process.env.EMAIL_FROM = '  ';
    expect(new ResendEmailSender().configured).toBe(false);
    process.env.EMAIL_FROM = 'Zed360 <alerts@zed360.example>';
    process.env.EMAIL_PROVIDER_API_KEY = '';
    expect(new ResendEmailSender().configured).toBe(false);
  });

  it('never calls the provider when it is not configured', async () => {
    process.env.EMAIL_PROVIDER_API_KEY = '';
    await expect(new ResendEmailSender().send(message)).rejects.toBeInstanceOf(
      EmailSendError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends one message with an idempotency key', async () => {
    fetchMock.mockReturnValue(reply(200, { id: 'email_123' }));

    await expect(new ResendEmailSender().send(message)).resolves.toEqual({
      id: 'email_123',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer re_test_key');
    expect(headers['idempotency-key']).toBe('zed360-notification-1');
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Zed360 <alerts@zed360.example>',
      to: ['owner@example.com'],
      subject: 'New matched request',
      text: 'Plain',
      html: '<p>Rich</p>',
    });
  });

  it.each([
    [403, true],
    [422, true],
    [429, false],
    [500, false],
    [503, false],
  ])('treats a %i response as permanent=%s', async (status, permanent) => {
    fetchMock.mockReturnValue(reply(status, { message: 'nope' }));
    await expect(new ResendEmailSender().send(message)).rejects.toMatchObject({
      permanent,
    });
  });

  it('treats a network failure as temporary and hides the key', async () => {
    fetchMock.mockRejectedValue(new Error('socket hang up re_test_key'));
    const attempt = new ResendEmailSender().send(message);
    await expect(attempt).rejects.toMatchObject({ permanent: false });
    await expect(attempt).rejects.not.toThrow(/re_test_key/);
  });
});
