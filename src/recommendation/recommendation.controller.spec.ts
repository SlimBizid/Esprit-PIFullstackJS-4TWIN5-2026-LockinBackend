import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

describe('RecommendationController', () => {
  let controller: RecommendationController;

  beforeEach(() => {
    controller = new RecommendationController({} as RecommendationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
