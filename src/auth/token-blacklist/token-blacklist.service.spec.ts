import { TokenBlacklistService } from './token-blacklist.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  const repo = {
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TokenBlacklistService(repo as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('stores a token with an expiration date', async () => {
    await service.blacklist('token-1', 60);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-1',
        expiresAt: expect.any(Date),
      }),
    );
  });

  it('returns false when a token is not found', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.isBlacklisted('missing')).resolves.toBe(false);
  });

  it('deletes expired tokens and returns false', async () => {
    repo.findOne.mockResolvedValue({
      token: 'expired',
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.isBlacklisted('expired')).resolves.toBe(false);
    expect(repo.delete).toHaveBeenCalledWith({ token: 'expired' });
  });

  it('returns true for active tokens', async () => {
    repo.findOne.mockResolvedValue({
      token: 'active',
      expiresAt: new Date(Date.now() + 1000),
    });

    await expect(service.isBlacklisted('active')).resolves.toBe(true);
  });

  it('purges expired records', async () => {
    await service.purgeExpired();

    expect(repo.delete).toHaveBeenCalledWith({
      expiresAt: expect.any(Object),
    });
  });
});
