import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { maskPhone } from './contact-hashing';
import { loadApiEnvironment } from './environment';

/**
 * Sends one-time codes through the WhatsApp Cloud API using an approved
 * authentication template. Without credentials outside production, codes are
 * written to the API log so the flow can be tested locally.
 */
@Injectable()
export class WhatsAppCodeSender {
  private readonly logger = new Logger(WhatsAppCodeSender.name);

  async send(e164: string, code: string) {
    loadApiEnvironment();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const template = process.env.WHATSAPP_AUTH_TEMPLATE;

    if (!phoneNumberId || !accessToken || !template) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Review verification is temporarily unavailable.',
        );
      }
      this.logger.warn(
        `WhatsApp is not configured. Review code for ${maskPhone(e164)}: ${code}`,
      );
      return;
    }

    const version = process.env.WHATSAPP_GRAPH_VERSION ?? 'v23.0';
    const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en';
    let response: Response;
    try {
      response = await fetch(
        `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: e164.slice(1),
            type: 'template',
            template: {
              name: template,
              language: { code: language },
              // Authentication templates take the code in the body and in
              // the copy-code button.
              components: [
                { type: 'body', parameters: [{ type: 'text', text: code }] },
                {
                  type: 'button',
                  sub_type: 'url',
                  index: '0',
                  parameters: [{ type: 'text', text: code }],
                },
              ],
            },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'The WhatsApp code could not be sent. Please try again.',
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(
        `WhatsApp rejected a review code (${response.status}): ${detail.slice(0, 300)}`,
      );
      throw new ServiceUnavailableException(
        'The WhatsApp code could not be sent. Check the number and try again.',
      );
    }
  }
}
