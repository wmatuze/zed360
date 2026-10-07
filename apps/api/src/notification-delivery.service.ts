import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from './database.service';
import { EmailSendError, EmailSender } from './email-sender';
import { loadApiEnvironment } from './environment';
import { notificationEmail } from './notification-email';

const POLL_INTERVAL_MS = 60_000;
const BATCH_SIZE = 20;
export const MAX_ATTEMPTS = 5;

/**
 * Emails owners and managers about new notifications.
 *
 * It works from the notification rows that already exist, so the code that
 * creates a notification is unchanged and a provider failure can never undo
 * the request or selection behind it. Each notification gets one delivery
 * row, which records every attempt and stops a second send.
 */
@Injectable()
export class NotificationDeliveryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly sender: EmailSender,
  ) {}

  onModuleInit() {
    if (!this.sender.configured) {
      this.logger.log(
        'Email alerts are off: set EMAIL_PROVIDER_API_KEY and EMAIL_FROM to enable them.',
      );
      return;
    }
    this.timer = setInterval(() => void this.run(), POLL_INTERVAL_MS);
    this.timer.unref();
    this.logger.log('Email alerts are on.');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass: queue new notifications, then send whatever is due. */
  async run() {
    if (this.running) return { queued: 0, sent: 0, failed: 0 };
    this.running = true;
    try {
      const queued = await this.enqueue();
      const alerts = await this.deliverDue();
      const outbox = await this.deliverOutbox();
      return {
        queued,
        sent: alerts.sent + outbox.sent,
        failed: alerts.failed + outbox.failed,
      };
    } catch (error) {
      this.logger.error(
        `Email alert pass failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { queued: 0, sent: 0, failed: 0 };
    } finally {
      this.running = false;
    }
  }

  /**
   * Creates a delivery for each recent notification that should be emailed.
   * Only the last few hours are considered, so switching alerts on never
   * sends a backlog of old news.
   */
  async enqueue() {
    const rows = await this.database.client`
      insert into business_notification_deliveries (notification_id, channel)
      select notification.id, 'email'
      from business_notifications notification
      inner join business_notification_events event
        on event.id = notification.event_id
      inner join users recipient on recipient.id = notification.recipient_user_id
      where notification.created_at >= now() - interval '6 hours'
        and notification.read_at is null
        and notification.archived_at is null
        and event.type in ('request_matched', 'customer_selected')
        and recipient.email is not null
        and recipient.account_status = 'active'
        and recipient.email_alerts_enabled = true
      on conflict (notification_id, channel) do nothing
      returning id
    `;
    return rows.length;
  }

  async deliverDue() {
    // Claiming pushes the next attempt into the future in the same statement,
    // so two API instances can never pick up the same delivery.
    const due = await this.database.client`
      update business_notification_deliveries delivery
      set attempts = delivery.attempts + 1,
          next_attempt_at = now() + make_interval(mins => (2 * power(2, delivery.attempts))::int),
          updated_at = now()
      where delivery.id in (
        select candidate.id from business_notification_deliveries candidate
        where candidate.status = 'pending'
          and candidate.next_attempt_at <= now()
        order by candidate.next_attempt_at
        limit ${BATCH_SIZE}
        for update skip locked
      )
      returning delivery.id, delivery.attempts, delivery.notification_id
    `;

    let sent = 0;
    let failed = 0;
    for (const delivery of due) {
      const id = String(delivery.id);
      const attempts = Number(delivery.attempts);
      try {
        const [details] = await this.database.client`
          select event.title, event.body, event.action_url as "actionUrl",
                 business.name as "businessName", recipient.email,
                 recipient.email_alerts_enabled as "enabled",
                 recipient.account_status as "accountStatus"
          from business_notifications notification
          inner join business_notification_events event
            on event.id = notification.event_id
          inner join businesses business on business.id = event.business_id
          inner join users recipient
            on recipient.id = notification.recipient_user_id
          where notification.id = ${String(delivery.notification_id)}
        `;
        // The owner may have turned alerts off, or been suspended, since the
        // delivery was queued.
        if (
          !details?.email ||
          !details.enabled ||
          details.accountStatus !== 'active'
        ) {
          await this.finish(
            id,
            'failed',
            null,
            'Recipient no longer accepts email alerts.',
          );
          continue;
        }

        const email = notificationEmail({
          title: String(details.title),
          body: String(details.body),
          // Opening through this address marks the notification as read
          // and lands on the request it is about.
          actionUrl: `/business/notifications/${String(delivery.notification_id)}/open`,
          businessName: String(details.businessName),
          appUrl: this.appUrl(),
        });
        const result = await this.sender.send({
          to: String(details.email),
          ...email,
          idempotencyKey: `zed360-notification-${id}`,
        });
        await this.finish(id, 'sent', result.id, null);
        sent += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown send failure.';
        const permanent = error instanceof EmailSendError && error.permanent;
        if (permanent || attempts >= MAX_ATTEMPTS) {
          await this.finish(id, 'failed', null, message);
          failed += 1;
        } else {
          // Stays pending and is retried at next_attempt_at.
          await this.database.client`
            update business_notification_deliveries
            set last_error = ${message.slice(0, 500)}, updated_at = now()
            where id = ${id}
          `;
        }
        this.logger.warn(`Email alert ${id} attempt ${attempts}: ${message}`);
      }
    }
    return { sent, failed };
  }

  /**
   * Sends stored emails to people without an account, such as a customer who
   * asked to hear about responses. Messages older than a day are left unsent:
   * by then the news is stale.
   */
  async deliverOutbox() {
    const due = await this.database.client`
      update email_outbox message
      set attempts = message.attempts + 1,
          next_attempt_at = now() + make_interval(mins => (2 * power(2, message.attempts))::int),
          updated_at = now()
      where message.id in (
        select candidate.id from email_outbox candidate
        where candidate.status = 'pending'
          and candidate.next_attempt_at <= now()
          and candidate.created_at >= now() - interval '24 hours'
        order by candidate.next_attempt_at
        limit ${BATCH_SIZE}
        for update skip locked
      )
      returning message.id, message.attempts, message.to_email as "toEmail",
                message.subject, message.text_body as "text",
                message.html_body as "html"
    `;

    let sent = 0;
    let failed = 0;
    for (const message of due) {
      const id = String(message.id);
      const attempts = Number(message.attempts);
      const record = async (
        status: 'pending' | 'sent' | 'failed',
        providerMessageId: string | null,
        error: string | null,
      ) => {
        await this.database.client`
          update email_outbox
          set status = ${status}::notification_delivery_status,
              provider_message_id = ${providerMessageId},
              last_error = ${error ? error.slice(0, 500) : null},
              sent_at = case when ${status} = 'sent' then now() else null end,
              updated_at = now()
          where id = ${id}
        `;
      };
      try {
        const result = await this.sender.send({
          to: String(message.toEmail),
          subject: String(message.subject),
          text: String(message.text),
          html: String(message.html),
          idempotencyKey: `zed360-outbox-${id}`,
        });
        await record('sent', result.id, null);
        sent += 1;
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : 'Unknown send failure.';
        const permanent = error instanceof EmailSendError && error.permanent;
        const giveUp = permanent || attempts >= MAX_ATTEMPTS;
        await record(giveUp ? 'failed' : 'pending', null, reason);
        if (giveUp) failed += 1;
        this.logger.warn(`Email ${id} attempt ${attempts}: ${reason}`);
      }
    }
    return { sent, failed };
  }

  private async finish(
    id: string,
    status: 'sent' | 'failed',
    providerMessageId: string | null,
    error: string | null,
  ) {
    await this.database.client`
      update business_notification_deliveries
      set status = ${status}::notification_delivery_status,
          provider_message_id = ${providerMessageId},
          last_error = ${error ? error.slice(0, 500) : null},
          sent_at = case when ${status} = 'sent' then now() else null end,
          updated_at = now()
      where id = ${id}
    `;
  }

  private appUrl() {
    loadApiEnvironment();
    return (
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.WEB_ORIGIN ??
      'http://localhost:3000'
    );
  }
}
