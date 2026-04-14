import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  LeaderboardService,
  ScoreLeaderboardItem,
} from './leaderboard.service';
import { LeaderboardEntry } from './entities/leaderboard.entity';
import { UserChallengeReward } from './entities/user-challenge-reward.entity';
import { User } from '../user/entities/user.entity';
import { ChallengeDifficulty } from '../challenge/enums/challenge-difficulty.enums';
import { ChallengeType } from '../challenge/enums/challenge-type.enums';
import { LeaderboardScope } from './enums/leaderboard-scope.enum';

const mockEntry = (overrides = {}): LeaderboardEntry =>
  ({
    id: 'entry-uuid',
    userId: 'user-uuid',
    totalScore: 0,
    challengeCompletions: 0,
    lastLoginXpAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as LeaderboardEntry;

const mockUser = (overrides = {}): User =>
  ({
    id: 'user-uuid',
    username: 'testuser',
    email: 'test@test.com',
    xp: 0,
    ...overrides,
  }) as User;

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  const mockLeaderboardRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRewardRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockRewardRepo.create.mockImplementation((dto) => dto);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getRepositoryToken(LeaderboardEntry),
          useValue: mockLeaderboardRepo,
        },
        {
          provide: getRepositoryToken(UserChallengeReward),
          useValue: mockRewardRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    jest.clearAllMocks();
  });

  describe('createEntry', () => {
    it('creates a leaderboard entry for a new user', async () => {
      mockLeaderboardRepo.findOne.mockResolvedValue(null);
      mockLeaderboardRepo.create.mockReturnValue(mockEntry());
      mockLeaderboardRepo.save.mockResolvedValue(mockEntry());

      const result = await service.createEntry({ userId: 'user-uuid' });

      expect(result.userId).toBe('user-uuid');
      expect(result.totalScore).toBe(0);
      expect(mockLeaderboardRepo.save).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException if entry already exists', async () => {
      mockLeaderboardRepo.findOne.mockResolvedValue(mockEntry());

      await expect(
        service.createEntry({ userId: 'user-uuid' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('awardChallenge', () => {
    it('awards EASY + SOLO: +50 score, +20 xp', async () => {
      const entry = mockEntry();
      const user = mockUser();

      mockRewardRepo.findOne.mockResolvedValue(null);
      mockLeaderboardRepo.findOne.mockResolvedValue(entry);
      mockUserRepo.findOne.mockResolvedValue(user);
      mockRewardRepo.save.mockResolvedValue({
        ...entry,
        userId: 'user-uuid',
        challengeId: 1,
        scoreAwarded: 50,
        xpAwarded: 20,
      });
      mockLeaderboardRepo.save.mockResolvedValue(entry);
      mockUserRepo.save.mockResolvedValue(user);

      await service.awardChallenge({
        userId: 'user-uuid',
        challengeId: 1,
        difficulty: ChallengeDifficulty.EASY,
        type: ChallengeType.SOLO,
      });

      expect(entry.totalScore).toBe(50);
      expect(entry.challengeCompletions).toBe(1);
      expect(user.xp).toBe(20);
      expect(mockRewardRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid',
          challengeId: 1,
          scoreAwarded: 50,
          xpAwarded: 20,
        }),
      );
    });

    it('awards MEDIUM + PVP: +150 score (100+50), +70 xp (50+20)', async () => {
      const entry = mockEntry();
      const user = mockUser();

      mockLeaderboardRepo.findOne.mockResolvedValue(entry);
      mockUserRepo.findOne.mockResolvedValue(user);
      mockLeaderboardRepo.save.mockResolvedValue(entry);
      mockUserRepo.save.mockResolvedValue(user);

      await service.awardChallenge({
        userId: 'user-uuid',
        challengeId: 2,
        difficulty: ChallengeDifficulty.MEDIUM,
        type: ChallengeType.PVP,
      });

      expect(entry.totalScore).toBe(150);
      expect(user.xp).toBe(70);
    });

    it('awards HARD + TEAMS: +230 score (200+30), +110 xp (100+10)', async () => {
      const entry = mockEntry();
      const user = mockUser();

      mockLeaderboardRepo.findOne.mockResolvedValue(entry);
      mockUserRepo.findOne.mockResolvedValue(user);
      mockLeaderboardRepo.save.mockResolvedValue(entry);
      mockUserRepo.save.mockResolvedValue(user);

      await service.awardChallenge({
        userId: 'user-uuid',
        challengeId: 3,
        difficulty: ChallengeDifficulty.HARD,
        type: ChallengeType.TEAMS,
      });

      expect(entry.totalScore).toBe(230);
      expect(user.xp).toBe(110);
    });

    it('throws NotFoundException if user or entry is missing', async () => {
      mockRewardRepo.findOne.mockResolvedValue(null);
      mockLeaderboardRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.awardChallenge({
          userId: 'ghost-uuid',
          challengeId: 1,
          difficulty: ChallengeDifficulty.EASY,
          type: ChallengeType.SOLO,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('awardLoginXp', () => {
    it('adds 10 XP on first login of the day', async () => {
      const user = mockUser({ xp: 40 });
      const entry = mockEntry({ lastLoginXpAt: null });

      mockUserRepo.findOne.mockResolvedValue(user);
      mockLeaderboardRepo.findOne.mockResolvedValue(entry);
      mockUserRepo.save.mockResolvedValue(user);
      mockLeaderboardRepo.save.mockResolvedValue(entry);

      await service.awardLoginXp('user-uuid');

      expect(user.xp).toBe(50);
    });

    it('does NOT award XP if already awarded today', async () => {
      const user = mockUser({ xp: 40 });
      const today = new Date();
      const entry = mockEntry({ lastLoginXpAt: today });

      mockUserRepo.findOne.mockResolvedValue(user);
      mockLeaderboardRepo.findOne.mockResolvedValue(entry);

      await service.awardLoginXp('user-uuid');

      expect(user.xp).toBe(40);
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it('does nothing silently if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockLeaderboardRepo.findOne.mockResolvedValue(null);

      await expect(service.awardLoginXp('ghost-uuid')).resolves.toBeUndefined();
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getScoreLeaderboard', () => {
    it('returns aggregated season score data by default', async () => {
      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            userId: 'user-uuid',
            totalScore: '220',
            challengeCompletions: '4',
          },
          {
            userId: 'other-uuid',
            totalScore: '180',
            challengeCompletions: '3',
          },
        ]),
      };

      mockRewardRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);

      const result = await service.getScoreLeaderboard();

      expect(result).toEqual<ScoreLeaderboardItem[]>([
        { userId: 'user-uuid', totalScore: 220, challengeCompletions: 4 },
        { userId: 'other-uuid', totalScore: 180, challengeCompletions: 3 },
      ]);
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'reward.season = :season',
        expect.any(Object),
      );
    });

    it('returns aggregated 24h score data when scope is 24h', async () => {
      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            userId: 'user-uuid',
            totalScore: '120',
            challengeCompletions: '3',
          },
          {
            userId: 'other-uuid',
            totalScore: '80',
            challengeCompletions: '2',
          },
        ]),
      };

      mockRewardRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);

      const result = await service.getScoreLeaderboard(LeaderboardScope.DAY);

      expect(result).toEqual<ScoreLeaderboardItem[]>([
        { userId: 'user-uuid', totalScore: 120, challengeCompletions: 3 },
        { userId: 'other-uuid', totalScore: 80, challengeCompletions: 2 },
      ]);
      expect(queryBuilderMock.where).toHaveBeenCalled();
    });
  });

  describe('getXpLeaderboard', () => {
    it('returns users ordered by xp DESC', async () => {
      const users = [mockUser({ xp: 500 }), mockUser({ xp: 200 })];
      mockUserRepo.find.mockResolvedValue(users);

      const result = await service.getXpLeaderboard();

      expect(result[0].xp).toBe(500);
      expect(result[1].xp).toBe(200);
    });
  });

  describe('getUserStanding', () => {
    it('returns current season scoreEntry, scoreRank, xpRank, and xp for a user', async () => {
      const user = mockUser({ xp: 80 });
      const allUsers = [mockUser({ id: 'other-uuid', xp: 200 }), user];

      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            userId: 'other-uuid',
            totalScore: '200',
            challengeCompletions: '4',
          },
          {
            userId: 'user-uuid',
            totalScore: '100',
            challengeCompletions: '2',
          },
        ]),
      };

      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.find.mockResolvedValue(allUsers);
      mockRewardRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);

      const result = await service.getUserStanding('user-uuid');

      expect(result.scoreEntry).toEqual({
        userId: 'user-uuid',
        totalScore: 100,
        challengeCompletions: 2,
      });
      expect(result.scoreRank).toBe(2);
      expect(result.xp).toBe(80);
      expect(result.xpRank).toBe(2);
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'reward.season = :season',
        expect.any(Object),
      );
    });

    it('throws NotFoundException if user is missing', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.find.mockResolvedValue([]);
      mockRewardRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      await expect(service.getUserStanding('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
