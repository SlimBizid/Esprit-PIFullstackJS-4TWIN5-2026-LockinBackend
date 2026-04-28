import { TokenBlacklistService } from './token-blacklist.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;

  beforeEach(() => {
    service = new TokenBlacklistService({} as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
