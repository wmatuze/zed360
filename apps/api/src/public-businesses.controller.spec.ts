import { BadRequestException } from '@nestjs/common';
import { PublicBusinessesController } from './public-businesses.controller';
import { PublicBusinessesService } from './public-businesses.service';

describe('PublicBusinessesController', () => {
  const getDirectory = jest.fn();
  const getProfile = jest.fn();
  const compare = jest.fn();
  const recordActivity = jest.fn();
  const controller = new PublicBusinessesController({
    getDirectory,
    getProfile,
    compare,
    recordActivity,
  } as unknown as PublicBusinessesService);

  beforeEach(() => {
    getDirectory.mockReset().mockResolvedValue({ businesses: [] });
    getProfile.mockReset().mockResolvedValue({});
    compare.mockReset().mockResolvedValue({ businesses: [] });
    recordActivity.mockReset().mockResolvedValue(undefined);
  });

  it('normalizes and validates public directory filters', async () => {
    await controller.getDirectory({
      q: '  solar  ',
      category: 'energy',
      fulfillment: 'business_travel',
      page: '2',
    });
    expect(getDirectory).toHaveBeenCalledWith({
      q: 'solar',
      category: 'energy',
      fulfillment: 'business_travel',
      page: 2,
    });
  });

  it('rejects unknown fulfillment modes', () => {
    expect(() =>
      controller.getDirectory({ fulfillment: 'teleportation' }),
    ).toThrow(BadRequestException);
    expect(getDirectory).not.toHaveBeenCalled();
  });

  it('loads a public profile by slug', async () => {
    await controller.getProfile('kartu-limited');
    expect(getProfile).toHaveBeenCalledWith('kartu-limited');
  });

  it('loads two unique businesses for comparison', async () => {
    await controller.compare({ slugs: 'kartu-limited,corium-and-co' });
    expect(compare).toHaveBeenCalledWith(['kartu-limited', 'corium-and-co']);
  });

  it('rejects fewer than two comparison businesses', () => {
    expect(() => controller.compare({ slugs: 'kartu-limited' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects malformed profile slugs', () => {
    expect(() => controller.getProfile('../private')).toThrow(
      BadRequestException,
    );
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('records a valid activity for a business', async () => {
    await controller.recordActivity('kopa-motors', {
      event: 'contact_whatsapp',
    });
    expect(recordActivity).toHaveBeenCalledWith(
      'kopa-motors',
      'contact_whatsapp',
    );
  });

  it('rejects unknown activity and malformed slugs without recording', async () => {
    await expect(
      controller.recordActivity('kopa-motors', { event: 'purchase' }),
    ).rejects.toThrow('A valid activity is required.');
    await expect(
      controller.recordActivity('../admin', { event: 'profile_view' }),
    ).rejects.toThrow('A valid activity is required.');
    expect(recordActivity).not.toHaveBeenCalled();
  });
});
