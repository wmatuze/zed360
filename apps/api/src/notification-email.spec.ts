import { notificationEmail, notificationLink } from './notification-email';

const input = {
  title: 'New matched request',
  body: 'A customer in Kitwe needs 5 laptops.',
  actionUrl: '/business/requests',
  businessName: 'Kopa Motors',
  appUrl: 'https://zed360.example/',
};

describe('notification email', () => {
  it('links back into Zed360 and names the business', () => {
    const email = notificationEmail(input);
    expect(email.subject).toBe('New matched request — Kopa Motors');
    expect(email.text).toContain(
      'Open in Zed360: https://zed360.example/business/requests',
    );
    expect(email.text).toContain('A customer in Kitwe needs 5 laptops.');
    expect(email.html).toContain(
      'href="https://zed360.example/business/requests"',
    );
  });

  it('always says why it was sent and how to stop it', () => {
    const email = notificationEmail(input);
    for (const body of [email.text, email.html]) {
      expect(body).toContain('you manage Kopa Motors on Zed360');
      expect(body).toContain('https://zed360.example/business/account');
    }
  });

  it('escapes customer-written text in the HTML version', () => {
    const email = notificationEmail({
      ...input,
      title: 'Need <b>urgent</b> help',
      body: '<script>alert(1)</script> & "quotes"',
      businessName: 'A & B <Traders>',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<b>urgent</b>');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain('A &amp; B &lt;Traders&gt;');
    // The plain-text version is not HTML and keeps the text as written.
    expect(email.text).toContain('<script>alert(1)</script> & "quotes"');
  });

  it.each([
    'https://evil.example/steal',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '',
    null,
  ])('never links to another site (%p)', (actionUrl) => {
    expect(notificationLink('https://zed360.example', actionUrl)).toBe(
      'https://zed360.example/business/notifications',
    );
  });

  it('keeps the subject on one line', () => {
    const email = notificationEmail({ ...input, title: 'Line one\nLine two' });
    expect(email.subject).not.toMatch(/[\r\n]/);
  });
});
