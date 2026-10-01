import { fromPoint, toPoint } from './location-coordinates';

describe('location coordinates', () => {
  it('stores longitude as x and latitude as y', () => {
    expect(toPoint({ latitude: -12.8, longitude: 28.21 })).toEqual({
      x: 28.21,
      y: -12.8,
    });
  });

  it('reads stored points back as latitude and longitude', () => {
    expect(fromPoint({ x: 28.21, y: -12.8 })).toEqual({
      latitude: -12.8,
      longitude: 28.21,
    });
  });

  it('treats a missing or cleared pin as null', () => {
    expect(toPoint(null)).toBeNull();
    expect(toPoint(undefined)).toBeNull();
    expect(fromPoint(null)).toBeNull();
  });
});
