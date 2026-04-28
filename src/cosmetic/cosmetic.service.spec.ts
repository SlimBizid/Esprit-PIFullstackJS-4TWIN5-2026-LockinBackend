import { CosmeticService } from './cosmetic.service';

describe('CosmeticService', () => {
  let service: CosmeticService;

  beforeEach(() => {
    service = new CosmeticService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
