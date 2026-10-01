import { ServiceUnavailableException } from '@nestjs/common';
import {
  contactHash,
  hashesMatch,
  maskPhone,
  normalizePhone,
  verificationCodeHash,
} from './contact-hashing';

describe('contact hashing', () => {
  const originalSecret = process.env.CONTACT_HASH_SECRET;

  beforeEach(() => {
    process.env.CONTACT_HASH_SECRET = 's'.repeat(40);
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.CONTACT_HASH_SECRET;
    else process.env.CONTACT_HASH_SECRET = originalSecret;
  });

  it.each([
    '0977123456',
    '0977 123 456',
    '977123456',
    '260977123456',
    '+260 977-123-456',
    '00260977123456',
    '(0977) 123 456',
  ])('normalizes the Zambian number %s', (input) => {
    expect(normalizePhone(input)).toBe('+260977123456');
  });

  it('keeps international numbers that include a country code', () => {
    expect(normalizePhone('+27 82 123 4567')).toBe('+27821234567');
  });

  it.each(['12345', '0977123', 'phone', '+0977123456', '97712345678901234'])(
    'rejects %s',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );

  it('produces the same hash for every way of writing a number', () => {
    const hashes = ['0977123456', '+260977123456', '977 123 456']
      .map((input) => normalizePhone(input)!)
      .map(contactHash);
    expect(new Set(hashes).size).toBe(1);
    expect(hashes[0]).not.toContain('977123456');
  });

  it('binds code hashes to their verification', () => {
    const hash = verificationCodeHash('verification-a', '123456');
    expect(
      hashesMatch(hash, verificationCodeHash('verification-a', '123456')),
    ).toBe(true);
    expect(
      hashesMatch(hash, verificationCodeHash('verification-b', '123456')),
    ).toBe(false);
    expect(
      hashesMatch(hash, verificationCodeHash('verification-a', '123457')),
    ).toBe(false);
  });

  it('masks all but the last digits', () => {
    expect(maskPhone('+260977123456')).toBe('•••• 456');
  });

  it('refuses to hash without a strong secret', () => {
    process.env.CONTACT_HASH_SECRET = 'short';
    expect(() => contactHash('+260977123456')).toThrow(
      ServiceUnavailableException,
    );
  });
});
