import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ChallengeService } from 'src/challenge/challenge.service';
import { UserType } from 'src/user/enums/user-type.enum';
import { ReviewService } from './review.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepository: {
    exist: jest.Mock;
  };
  let challengeSubmissionRepository: {
    exist: jest.Mock;
  };
  let matchSubmissionRepository: {
    createQueryBuilder: jest.Mock;
  };
  let imposterSubmissionRepository: {
    createQueryBuilder: jest.Mock;
  };
  let challengeService: {
    findOne: jest.Mock;
  };

  beforeEach(() => {
    reviewRepository = {
      exist: jest.fn(),
    };
    challengeSubmissionRepository = {
      exist: jest.fn(),
    };
    matchSubmissionRepository = {
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    };
    imposterSubmissionRepository = {
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    };
    challengeService = {
      findOne: jest.fn().mockResolvedValue({ id: 8 }),
    };

    service = new ReviewService(
      reviewRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      challengeSubmissionRepository as never,
      matchSubmissionRepository as never,
      imposterSubmissionRepository as never,
      challengeService as unknown as ChallengeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject review creation when the user has not submitted the challenge', async () => {
    challengeSubmissionRepository.exist.mockResolvedValue(false);

    await expect(
      service.createChallengeReview(8, { title: 'Title', content: 'Content' }, {
        id: 'user-1',
        type: UserType.PLAYER,
      } as never),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject duplicate reviews even if the user has submitted before', async () => {
    challengeSubmissionRepository.exist.mockResolvedValue(true);
    reviewRepository.exist.mockResolvedValue(true);

    await expect(
      service.createChallengeReview(8, { title: 'Title', content: 'Content' }, {
        id: 'user-1',
        type: UserType.PLAYER,
      } as never),
    ).rejects.toThrow(ConflictException);
  });
});
