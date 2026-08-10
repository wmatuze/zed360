import { BadRequestException } from '@nestjs/common';
import { PublicBusinessesController } from './public-businesses.controller';
import { PublicBusinessesService } from './public-businesses.service';

describe('PublicBusinessesController', () => {
  const getDirectory = jest.fn();
  const getProfile = jest.fn();
  const controller = new PublicBusinessesController({
    getDirectory,
    getProfile,
  } as unknown as PublicBusinessesService);

  beforeEach(() => {
    getDirectory.mockReset().mockResolvedValue({ businesses: [] });
    getProfile.mockReset().mockResolvedValue({});
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

  it('rejects malformed profile slugs', () => {
    expect(() => controller.getProfile('../private')).toThrow(
      BadRequestException,
    );
    expect(getProfile).not.toHaveBeenCalled();
  });
});
