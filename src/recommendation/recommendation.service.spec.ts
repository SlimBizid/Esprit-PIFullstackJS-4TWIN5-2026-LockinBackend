import { RecommendationService } from './recommendation.service';
import { ChallengeType } from 'src/challenge/enums/challenge-type.enums';

describe('RecommendationService', () => {
  let service: RecommendationService;
  const recommendationRepository = {
    find: jest.fn(),
  };
  const challengeRepository = {
    find: jest.fn(),
  };
  const submissionRepository = {
    find: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RecommendationService(
      recommendationRepository as never,
      challengeRepository as never,
      submissionRepository as never,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns stored recommendations when available', async () => {
    recommendationRepository.find.mockResolvedValue([
      {
        challengeId: 'challenge-1',
        score: '0.91',
        rank: 1,
        reason: 'Because you solved arrays fast.',
        modelVersion: 'model-v1',
        generatedAt: new Date('2026-05-01T00:00:00.000Z'),
        challenge: {
          id: 'challenge-1',
          title: 'Arrays',
          difficulty: 'easy',
          type: 'solo',
          topics: ['arrays'],
          acceptanceRate: '88',
        },
      },
      {
        challengeId: 'challenge-2',
        score: '0.73',
        rank: 2,
        reason: '   ',
        modelVersion: 'model-v1',
        generatedAt: new Date('2026-05-01T00:00:00.000Z'),
        challenge: {
          id: 'challenge-2',
          title: 'Graphs',
          difficulty: 'hard',
          type: 'quiz',
          topics: ['graphs'],
          acceptanceRate: '41',
        },
      },
      {
        challengeId: 'challenge-3',
        score: '0.4',
        rank: 3,
        reason: 'ignored',
        modelVersion: 'model-v1',
        generatedAt: new Date('2026-05-01T00:00:00.000Z'),
        challenge: null,
      },
    ]);

    const result = await service.listForUser({ id: 'user-1' } as any, 3);

    expect(recommendationRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        take: 3,
      }),
    );
    expect(result.data).toHaveLength(2);
    expect(result.data[0].score).toBe(0.91);
    expect(result.data[1].reason).toContain('Stretch challenge');
    expect(result.meta.modelVersion).toBe('model-v1');
  });

  it('builds fallback recommendations and clamps invalid limits', async () => {
    recommendationRepository.find.mockResolvedValue([]);
    submissionRepository.find.mockResolvedValue([{ challengeId: 'challenge-1' }]);
    challengeRepository.find.mockResolvedValue([
      {
        id: 'challenge-2',
        title: 'Loops',
        difficulty: 'easy',
        type: ChallengeType.SOLO,
        topics: ['loops'],
        acceptanceRate: '95',
        createdAt: new Date(),
      },
      {
        id: 'challenge-3',
        title: 'Binary Search',
        difficulty: 'medium',
        type: ChallengeType.QUIZ,
        topics: ['search'],
        acceptanceRate: '80',
        createdAt: new Date(),
      },
    ]);

    const result = await service.listForUser({ id: 'user-1' } as any, 99);

    expect(challengeRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      }),
    );
    expect(result.meta.modelVersion).toBe('heuristic-acceptance-rate');
    expect(result.data[0].reason).toContain('Good entry point');
    expect(result.data[1].reason).toContain('Balanced next step');
  });
});
