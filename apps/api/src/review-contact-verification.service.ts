import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { ReviewCodeSent } from '@zed360/contracts';
import {
  and,
  businessMembers,
  businesses,
  eq,
  inArray,
  reviewContactVerifications,
  reviews,
  sql,
  users,
} from '@zed360/database';
import { randomInt, randomUUID } from 'node:crypto';
import {
  contactHash,
  hashesMatch,
  maskPhone,
  normalizePhone,
  verificationCodeHash,
} from './contact-hashing';
import { DatabaseService } from './database.service';
import { SignInAttemptLimiter } from './sign-in-attempt-limiter.service';
import { WhatsAppCodeSender } from './whatsapp-code-sender.service';

export const reviewCodeTtlMinutes = 10;
export const maxReviewCodeAttempts = 5;
export const reviewRepeatWindowDays = 180;

const invalidCodeMessage =
  'That code is incorrect or has expired. Request a new code and try again.';

@Injectable()
export class ReviewContactVerificationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly attempts: SignInAttemptLimiter,
    private readonly sender: WhatsAppCodeSender,
  ) {}

  async issue(
    target: { requestId: string; businessId: string; interactionId: string },
    phone: string,
  ): Promise<ReviewCodeSent> {
    const e164 = normalizePhone(phone);
    if (!e164) {
      throw new BadRequestException(
        'Enter a WhatsApp number, for example 0977 123 456 or +260 977 123 456.',
      );
    }
    const hash = contactHash(e164);

    await this.attempts.consume('reviewCodeRequest', target.requestId, null);
    await this.attempts.consume('reviewCodePhone', hash, null);
    await this.assertNotBusinessContact(target.businessId, hash);
    await this.assertNotRecentlyReviewed(
      target.businessId,
      hash,
      target.interactionId,
    );

    const verificationId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + reviewCodeTtlMinutes * 60_000);
    await this.database.db.insert(reviewContactVerifications).values({
      id: verificationId,
      requestId: target.requestId,
      contactHash: hash,
      codeHash: verificationCodeHash(verificationId, code),
      expiresAt,
    });

    try {
      await this.sender.send(e164, code);
    } catch (error) {
      await this.database.db
        .delete(reviewContactVerifications)
        .where(eq(reviewContactVerifications.id, verificationId));
      throw error;
    }

    return {
      verificationId,
      sentTo: maskPhone(e164),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Checks a code and marks it used. Every check spends one attempt, so a
   * code cannot be guessed. Returns the confirmed contact hash.
   */
  async consume(requestId: string, verificationId: string, code: string) {
    const [verification] = await this.database.db
      .update(reviewContactVerifications)
      .set({ attempts: sql`${reviewContactVerifications.attempts} + 1` })
      .where(
        and(
          eq(reviewContactVerifications.id, verificationId),
          eq(reviewContactVerifications.requestId, requestId),
          sql`${reviewContactVerifications.consumedAt} is null`,
          sql`${reviewContactVerifications.expiresAt} > now()`,
          sql`${reviewContactVerifications.attempts} < ${maxReviewCodeAttempts}`,
        ),
      )
      .returning({
        codeHash: reviewContactVerifications.codeHash,
        contactHash: reviewContactVerifications.contactHash,
      });

    if (
      !verification ||
      !hashesMatch(
        verification.codeHash,
        verificationCodeHash(verificationId, code),
      )
    ) {
      throw new BadRequestException(invalidCodeMessage);
    }

    const [consumed] = await this.database.db
      .update(reviewContactVerifications)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(reviewContactVerifications.id, verificationId),
          sql`${reviewContactVerifications.consumedAt} is null`,
        ),
      )
      .returning({ id: reviewContactVerifications.id });
    if (!consumed) throw new BadRequestException(invalidCodeMessage);

    return verification.contactHash;
  }

  async assertNotRecentlyReviewed(
    businessId: string,
    hash: string,
    interactionId: string,
  ) {
    const [existing] = await this.database.db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.businessId, businessId),
          eq(reviews.reviewerContactHash, hash),
          sql`${reviews.interactionId} <> ${interactionId}`,
          sql`${reviews.createdAt} > now() - make_interval(days => ${reviewRepeatWindowDays})`,
        ),
      )
      .limit(1);
    if (existing) {
      throw new ConflictException(
        'This number has already reviewed this business recently.',
      );
    }
  }

  private async assertNotBusinessContact(businessId: string, hash: string) {
    const [[business], members] = await Promise.all([
      this.database.db
        .select({ phone: businesses.phone, whatsapp: businesses.whatsapp })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1),
      this.database.db
        .select({ phone: users.phone })
        .from(businessMembers)
        .innerJoin(users, eq(businessMembers.userId, users.id))
        .where(
          and(
            eq(businessMembers.businessId, businessId),
            inArray(businessMembers.role, ['owner', 'manager', 'staff']),
          ),
        ),
    ]);

    const businessNumbers = [
      business?.phone,
      business?.whatsapp,
      ...members.map((member) => member.phone),
    ]
      .filter((value): value is string => Boolean(value))
      .map(normalizePhone)
      .filter((value): value is string => Boolean(value));

    if (businessNumbers.some((number) => contactHash(number) === hash)) {
      throw new ForbiddenException(
        'Numbers connected to this business cannot review it.',
      );
    }
  }
}
