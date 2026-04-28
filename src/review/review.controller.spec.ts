import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

describe('ReviewController', () => {
  let controller: ReviewController;

  beforeEach(() => {
    controller = new ReviewController({} as ReviewService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
