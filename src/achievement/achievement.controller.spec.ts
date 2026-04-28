import { AchievementController } from './achievement.controller';
import { AchievementService } from './achievement.service';

describe('AchievementController', () => {
  let controller: AchievementController;

  beforeEach(() => {
    controller = new AchievementController({} as AchievementService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
