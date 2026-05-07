import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

describe('LeaderboardController', () => {
  let controller: LeaderboardController;

  beforeEach(() => {
    controller = new LeaderboardController({} as LeaderboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
