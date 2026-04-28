import { RecommendationService } from './recommendation.service';

describe('RecommendationService', () => {
  let service: RecommendationService;

  beforeEach(() => {
    service = new RecommendationService(
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
