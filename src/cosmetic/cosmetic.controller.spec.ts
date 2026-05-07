import { CosmeticController } from './cosmetic.controller';
import { CosmeticService } from './cosmetic.service';

describe('CosmeticController', () => {
  let controller: CosmeticController;

  beforeEach(() => {
    controller = new CosmeticController({} as CosmeticService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
