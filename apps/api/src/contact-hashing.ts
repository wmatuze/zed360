import { ServiceUnavailableException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { loadApiEnvironment } from './environment';

/**
 * Normalizes a phone number to E.164. Zambian local forms (0977…, 977…,
 * 260977…) become +260…, and other countries must include their code.
 */
export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(/[\s().-]/g, '');
  let candidate: string;
  if (compact.startsWith('+')) candidate = compact;
  else if (compact.startsWith('00')) candidate = `+${compact.slice(2)}`;
  else if (/^0\d{9}$/.test(compact)) candidate = `+260${compact.slice(1)}`;
  else if (/^[79]\d{8}$/.test(compact)) candidate = `+260${compact}`;
  else if (/^260\d{9}$/.test(compact)) candidate = `+${compact}`;
  else return null;
  return /^\+[1-9]\d{7,14}$/.test(candidate) ? candidate : null;
}

export function maskPhone(e164: string) {
  return `•••• ${e164.slice(-3)}`;
}

function hashSecret() {
  loadApiEnvironment();
  const secret = process.env.CONTACT_HASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new ServiceUnavailableException(
      'Review verification is not configured.',
    );
  }
  return secret;
}

/** Keyed hash, so stored values cannot be reversed by guessing numbers. */
export function contactHash(e164: string) {
  return createHmac('sha256', hashSecret())
    .update(`phone:${e164}`)
    .digest('hex');
}

export function verificationCodeHash(verificationId: string, code: string) {
  return createHmac('sha256', hashSecret())
    .update(`review-code:${verificationId}:${code}`)
    .digest('hex');
}

export function hashesMatch(expected: string, provided: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
