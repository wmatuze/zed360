export type NotificationEmailInput = {
  title: string;
  body: string;
  actionUrl: string | null;
  businessName: string;
  appUrl: string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * A link back into Zed360. Only same-site paths stored with the notification
 * are used; anything else falls back to the notification centre, so an email
 * can never carry a link to another site.
 */
export function notificationLink(appUrl: string, actionUrl: string | null) {
  const base = appUrl.replace(/\/+$/, '');
  const path =
    actionUrl && /^\/(?![/\\])/.test(actionUrl)
      ? actionUrl
      : '/business/notifications';
  return `${base}${path}`;
}

/**
 * The email for one notification. It repeats only what the notification
 * already shows inside Zed360: no customer contact details are added.
 */
export function notificationEmail(input: NotificationEmailInput) {
  const link = notificationLink(input.appUrl, input.actionUrl);
  const settings = notificationLink(input.appUrl, '/business/account');
  const footer = `You are receiving this because you manage ${input.businessName} on Zed360.`;
  const subject = `${input.title} — ${input.businessName}`
    .replace(/\s+/g, ' ')
    .slice(0, 200);

  const text = [
    input.title,
    '',
    input.body,
    '',
    `Open in Zed360: ${link}`,
    '',
    footer,
    `Turn these emails off: ${settings}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#0b0d12;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
      <p style="margin:0 0 6px;font-size:13px;color:#5b6170;">${escapeHtml(input.businessName)}</p>
      <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;">${escapeHtml(input.title)}</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.body)}</p>
      <a href="${escapeHtml(link)}" style="display:inline-block;background:#b8f238;color:#0b0d12;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 20px;border-radius:999px;">Open in Zed360</a>
      <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#5b6170;">${escapeHtml(footer)} <a href="${escapeHtml(settings)}" style="color:#5b6170;">Turn these emails off</a>.</p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
