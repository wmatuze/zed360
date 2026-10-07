import { Injectable } from '@nestjs/common';
import { loadApiEnvironment } from './environment';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Stops the provider sending the same alert twice if a send is retried. */
  idempotencyKey: string;
};

/** A send that failed. Permanent failures are not worth retrying. */
export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
  ) {
    super(message);
  }
}

export abstract class EmailSender {
  /** False until the provider key and sender address are set. */
  abstract readonly configured: boolean;
  abstract send(message: EmailMessage): Promise<{ id: string | null }>;
}

/** Sends through Resend (https://resend.com/docs/api-reference/emails). */
@Injectable()
export class ResendEmailSender extends EmailSender {
  private get apiKey() {
    loadApiEnvironment();
    return process.env.EMAIL_PROVIDER_API_KEY?.trim() || null;
  }

  private get from() {
    loadApiEnvironment();
    return process.env.EMAIL_FROM?.trim() || null;
  }

  get configured() {
    return Boolean(this.apiKey && this.from);
  }

  async send(message: EmailMessage) {
    const { apiKey, from } = this;
    if (!apiKey || !from) {
      throw new EmailSendError('Email sending is not configured.', false);
    }

    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'idempotency-key': message.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new EmailSendError(
        'The email provider could not be reached.',
        false,
      );
    }

    const body = (await response.json().catch(() => null)) as {
      id?: unknown;
      message?: unknown;
    } | null;
    if (!response.ok) {
      // Rate limits and provider faults may succeed later. Anything else
      // (a rejected address, an unverified sender) will fail the same way.
      const temporary = response.status === 429 || response.status >= 500;
      throw new EmailSendError(
        `Resend ${response.status}: ${typeof body?.message === 'string' ? body.message : 'request rejected'}`,
        !temporary,
      );
    }
    return { id: typeof body?.id === 'string' ? body.id : null };
  }
}
