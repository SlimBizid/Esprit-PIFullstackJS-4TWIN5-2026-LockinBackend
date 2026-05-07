import { isProductionEnvironment } from './environment.util';

describe('isProductionEnvironment', () => {
  const originalEnv = process.env.ENV;

  afterEach(() => {
    process.env.ENV = originalEnv;
  });

  it('returns true for prod aliases', () => {
    process.env.ENV = 'prod';
    expect(isProductionEnvironment()).toBe(true);

    process.env.ENV = 'production';
    expect(isProductionEnvironment()).toBe(true);
  });

  it('returns false for non-production values', () => {
    process.env.ENV = 'development';
    expect(isProductionEnvironment()).toBe(false);

    delete process.env.ENV;
    expect(isProductionEnvironment()).toBe(false);
  });
});
