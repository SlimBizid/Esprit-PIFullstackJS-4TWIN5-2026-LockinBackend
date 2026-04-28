import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ChallengeType } from 'src/challenge/enums/challenge-type.enums';
import { ChallengeService } from 'src/challenge/challenge.service';
import { CodeExecutionService } from 'src/code-execution/code-execution.service';
import { LeaderboardService } from 'src/leaderboard/leaderboard.service';
import { ImposterMatchStatus } from './enums/imposter-match-status.enum';
import { ImposterService } from './imposter.service';

describe('ImposterService', () => {
  let service: ImposterService;
  let matchRepository: {
    findOne: jest.Mock;
  };
  let participantRepository: {
    find: jest.Mock;
  };
  let challengeService: {
    findOne: jest.Mock;
  };

  beforeEach(() => {
    matchRepository = {
      findOne: jest.fn(),
    };
    participantRepository = {
      find: jest.fn(),
    };
    challengeService = {
      findOne: jest.fn(),
    };

    service = new ImposterService(
      matchRepository as never,
      participantRepository as never,
      {} as never,
      challengeService as unknown as ChallengeService,
      {} as CodeExecutionService,
      {} as LeaderboardService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject createMatch when the challenge is not an imposter challenge', async () => {
    challengeService.findOne.mockResolvedValue({
      id: 11,
      type: ChallengeType.SOLO,
    });

    await expect(
      service.createMatch({ challengeId: 11 }, { id: 'user-1' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject starting a lobby with fewer than three participants', async () => {
    matchRepository.findOne.mockResolvedValue({
      id: 'match-1',
      hostId: 'host-1',
      status: ImposterMatchStatus.LOBBY,
    });
    participantRepository.find.mockResolvedValue([
      { userId: 'host-1' },
      { userId: 'user-2' },
    ]);

    await expect(
      service.startMatch('match-1', { id: 'host-1' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject joining a non-lobby match', async () => {
    matchRepository.findOne.mockResolvedValue({
      id: 'match-2',
      status: ImposterMatchStatus.ACTIVE,
    });

    await expect(
      service.joinMatch('match-2', { id: 'user-1' } as never),
    ).rejects.toThrow(ConflictException);
  });
});
