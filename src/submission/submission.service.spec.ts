import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChallengeDifficulty } from 'src/challenge/enums/challenge-difficulty.enums';
import { ChallengeType } from 'src/challenge/enums/challenge-type.enums';
import { ChallengeService } from 'src/challenge/challenge.service';
import { CodeExecutionService } from 'src/code-execution/code-execution.service';
import { LeaderboardService } from 'src/leaderboard/leaderboard.service';
import { MatchVerdict } from 'src/match/enums/match-verdict.enum';
import { SubmissionService } from './submission.service';
import * as cssBattleScoreUtil from '../challenge/utils/css-battle-score.util';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let submissionRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let challengeService: {
    findOne: jest.Mock;
  };
  let leaderboardService: {
    awardChallenge: jest.Mock;
  };

  beforeEach(() => {
    submissionRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        id: 'submission-1',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        ...value,
      })),
    };
    challengeService = {
      findOne: jest.fn(),
    };
    leaderboardService = {
      awardChallenge: jest.fn(),
    };

    service = new SubmissionService(
      submissionRepository as never,
      challengeService as unknown as ChallengeService,
      {} as CodeExecutionService,
      leaderboardService as unknown as LeaderboardService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject non-solo challenge modes', async () => {
    challengeService.findOne.mockResolvedValue({
      id: 3,
      type: ChallengeType.PVP,
    });

    await expect(
      service.createSubmission(
        { challengeId: 3, language: 'typescript', sourceCode: 'print(1)' },
        { id: 'user-1' } as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should award the leaderboard on an accepted quiz submission', async () => {
    challengeService.findOne.mockResolvedValue({
      id: 4,
      title: 'Quiz',
      type: ChallengeType.QUIZ,
      difficulty: ChallengeDifficulty.EASY,
      quizQuestions: [
        {
          id: 'q1',
          prompt: 'Two plus two?',
          options: [
            { id: 'a', text: '4' },
            { id: 'b', text: '5' },
          ],
          correctOptionIds: ['a'],
        },
      ],
    });

    const result = await service.createSubmission(
      {
        challengeId: 4,
        answers: {
          q1: ['a'],
        },
      },
      { id: 'user-1' } as never,
    );

    expect(result.verdict).toBe(MatchVerdict.ACCEPTED);
    expect(leaderboardService.awardChallenge).toHaveBeenCalledWith({
      userId: 'user-1',
      challengeId: 4,
      difficulty: ChallengeDifficulty.EASY,
      type: ChallengeType.QUIZ,
    });
  });

  it('should surface a clear error when Playwright Chromium is missing for CSS battle submissions', async () => {
    jest
      .spyOn(cssBattleScoreUtil, 'scoreCssBattleCase')
      .mockRejectedValueOnce(
        new Error(
          "browserType.launch: Executable doesn't exist at /missing/chrome",
        ),
      );

    challengeService.findOne.mockResolvedValue({
      id: 5,
      title: 'CSS Battle',
      type: ChallengeType.CSS_BATTLE,
      difficulty: ChallengeDifficulty.MEDIUM,
      cases: [
        {
          inputs: [
            { type: 'targetHtml', value: '<div></div>' },
            { type: 'targetCss', value: 'div { width: 10px; height: 10px; }' },
          ],
          expectedOutput: '100',
        },
      ],
    });

    await expect(
      service.createSubmission(
        {
          challengeId: 5,
          language: 'css',
          sourceCode:
            '<style>div { width: 10px; height: 10px; }</style><div></div>',
        },
        { id: 'user-1' } as never,
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
