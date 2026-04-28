import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ChallengeType } from 'src/challenge/enums/challenge-type.enums';
import { ChallengeService } from 'src/challenge/challenge.service';
import { CodeExecutionService } from 'src/code-execution/code-execution.service';
import { LeaderboardService } from 'src/leaderboard/leaderboard.service';
import { MatchStatus } from './enums/match-status.enum';
import { MatchService } from './match.service';

describe('MatchService', () => {
  let service: MatchService;
  let matchRepository: {
    findOne: jest.Mock;
  };
  let challengeService: {
    findOne: jest.Mock;
  };

  beforeEach(() => {
    matchRepository = {
      findOne: jest.fn(),
    };
    challengeService = {
      findOne: jest.fn(),
    };

    service = new MatchService(
      matchRepository as never,
      {} as never,
      {} as never,
      challengeService as unknown as ChallengeService,
      {} as CodeExecutionService,
      {} as LeaderboardService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject createMatch when the challenge is not 1v1', async () => {
    challengeService.findOne.mockResolvedValue({
      id: 7,
      type: ChallengeType.SOLO,
    });

    await expect(
      service.createMatch({ challengeId: 7 }, { id: 'user-1' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject joinMatch when the current user is not a participant', async () => {
    matchRepository.findOne.mockResolvedValue({
      id: 'match-1',
      status: MatchStatus.ACTIVE,
      playerOneId: 'user-1',
      playerTwoId: 'user-2',
      challengeId: 1,
    });

    await expect(
      service.getMatch('match-1', { id: 'user-3' } as never),
    ).rejects.toThrow(ForbiddenException);
  });
});
