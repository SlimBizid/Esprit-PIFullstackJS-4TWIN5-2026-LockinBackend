import { UserType } from 'src/user/enums/user-type.enum';
import { AchievementService } from './achievement.service';

describe('AchievementService', () => {
  let service: AchievementService;
  let achievementRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let challengeRepository: {
    find: jest.Mock;
  };
  let imageStorageService: {
    uploadImage: jest.Mock;
  };
  let cosmeticService: {
    findRewardConflicts: jest.Mock;
    assignAchievementToCosmetics: jest.Mock;
  };

  beforeEach(() => {
    achievementRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
    };
    challengeRepository = {
      find: jest.fn(),
    };
    imageStorageService = {
      uploadImage: jest.fn(),
    };
    cosmeticService = {
      findRewardConflicts: jest.fn(),
      assignAchievementToCosmetics: jest.fn(),
    };

    service = new AchievementService(
      achievementRepository as never,
      {} as never,
      challengeRepository as never,
      imageStorageService as never,
      cosmeticService as never,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should link challenges when creating an achievement', async () => {
    const createdAt = new Date('2025-01-01T00:00:00.000Z');
    const linkedChallenges = [
      {
        id: 11,
        title: 'Grid Warmup',
        type: 'css_battle',
        difficulty: 'easy',
      },
      {
        id: 12,
        title: 'Flex Arena',
        type: 'css_battle',
        difficulty: 'medium',
      },
    ];

    imageStorageService.uploadImage.mockResolvedValue(
      'https://example.com/badge.png',
    );
    cosmeticService.findRewardConflicts.mockResolvedValue([]);
    challengeRepository.find.mockResolvedValue(linkedChallenges);
    achievementRepository.save.mockResolvedValue({
      id: 'achievement-1',
    });
    achievementRepository.findOne.mockResolvedValue({
      id: 'achievement-1',
      name: 'CSS Battle Starter',
      description: 'Finish your first CSS battle.',
      type: 'CSS Battles',
      imageUrl: 'https://example.com/badge.png',
      createdAt,
      Reward: [],
      challenges: linkedChallenges,
    });

    const result = await service.create(
      { type: UserType.ADMIN } as never,
      {
        name: 'CSS Battle Starter',
        description: 'Finish your first CSS battle.',
        type: 'CSS Battles' as never,
        challengeIds: [11, 12],
      },
      { buffer: Buffer.from('x') },
    );

    expect(achievementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        challenges: linkedChallenges,
      }),
    );
    expect(result.challenges).toEqual(linkedChallenges);
  });
});
