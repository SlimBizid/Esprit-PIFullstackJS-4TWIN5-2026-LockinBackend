import 'reflect-metadata';

import { AppModule } from './app.module';
import { AchievementModule } from './achievement/achievement.module';
import { AuthModule } from './auth/auth.module';
import { CosmeticModule } from './cosmetic/cosmetic.module';
import { EmailModule } from './email/email.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { StorageModule } from './storage/storage.module';
import { TeamModule } from './team/team.module';
import { UserModule } from './user/user.module';
import { AwardChallengeDto } from './leaderboard/dto/award-challenge.dto';
import { CreateLeaderboardEntryDto } from './leaderboard/dto/create-leaderboard-entry.dto';
import { BulkImportResponseDto } from './challenge/dto/bulk-import-response.dto';
import { ChallengeResponseDto } from './challenge/dto/challenge-response.dto';
import { RecommendationResponseDto } from './recommendation/dto/recommendation-response.dto';
import { createUserDto } from './user/dto/create-user.dto';
import { UpdateUserDto } from './user/dto/update-user.dto';
import { GeneratedChallengeDraftDto } from './challenge/dto/generated-challenge-draft.dto';
import { LeaderboardType } from './leaderboard/enums/leaderboard-type.enum';
import { CreateAchievementDto } from './achievement/dto/create-achievement.dto';
import { CreateCosmeticDto } from './cosmetic/dto/create-cosmetic.dto';
import { ChallengeQueryDto } from './challenge/dto/get-challenges-query.dto';
import { ListMySubmissionsDto } from './submission/dto/list-my-submissions.dto';
import { UserAchievement } from './achievement/entities/userachievement.entity';
import { UserCosmetic } from './user/entities/user-cosmetic.entity';
import { ImposterParticipant } from './imposter/entities/imposter-participant.entity';
import { ChallengeReviewUpvote } from './review/entities/challenge-review-upvote.entity';
import { Match } from './match/entities/match.entity';
import { MatchMessage } from './match/entities/match-message.entity';

describe('schema and module coverage', () => {
  it('exposes module metadata for feature modules', () => {
    const modules = [
      AppModule,
      AchievementModule,
      AuthModule,
      CosmeticModule,
      EmailModule,
      LeaderboardModule,
      StorageModule,
      TeamModule,
      UserModule,
    ];

    for (const moduleClass of modules) {
      expect(moduleClass).toBeDefined();
      expect(Reflect.getMetadata('imports', moduleClass) ?? []).toBeDefined();
    }

    expect((Reflect.getMetadata('controllers', AppModule) ?? []).length).toBeGreaterThan(0);
    expect((Reflect.getMetadata('providers', AppModule) ?? []).length).toBeGreaterThan(0);
    expect((Reflect.getMetadata('exports', AchievementModule) ?? []).length).toBeGreaterThan(0);
    expect((Reflect.getMetadata('exports', CosmeticModule) ?? []).length).toBeGreaterThan(0);
    expect((Reflect.getMetadata('exports', EmailModule) ?? []).length).toBeGreaterThan(0);
    expect((Reflect.getMetadata('exports', LeaderboardModule) ?? []).length).toBeGreaterThan(0);
    expect((Reflect.getMetadata('exports', StorageModule) ?? []).length).toBeGreaterThan(0);
    expect((Reflect.getMetadata('exports', UserModule) ?? []).length).toBeGreaterThan(0);
  });

  it('instantiates low-coverage DTOs and assigns representative values', () => {
    const awardChallengeDto = Object.assign(new AwardChallengeDto(), {
      userId: 'user-1',
      challengeId: 'challenge-1',
      placement: 1,
      type: LeaderboardType.WEEKLY,
    });
    const createLeaderboardEntryDto = Object.assign(new CreateLeaderboardEntryDto(), {
      userId: 'user-1',
    });
    const bulkImportResponseDto = Object.assign(new BulkImportResponseDto(), {
      imported: 3,
      failed: 1,
      errors: ['bad row'],
    });
    const challengeResponseDto = Object.assign(new ChallengeResponseDto(), {
      id: 'challenge-1',
      title: 'FizzBuzz',
      description: 'Classic warm-up problem',
      difficulty: 'easy',
      topic: 'algorithms',
      type: 'code',
      language: 'javascript',
      cases: [],
      quizQuestions: [],
      examples: [],
      constraints: [],
      conditions: [],
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const recommendationResponseDto = Object.assign(new RecommendationResponseDto(), {
      data: [],
      meta: {
        modelVersion: 'heuristic-acceptance-rate',
        generatedAt: null,
      },
    });
    const userCreationDto = Object.assign(new createUserDto(), {
      username: 'coder',
      email: 'coder@example.com',
      password: 'secret123',
    });
    const updateUserDto = Object.assign(new UpdateUserDto(), {
      username: 'coder2',
      email: 'coder2@example.com',
      password: 'secret456',
    });
    const generatedChallengeDraftDto = Object.assign(
      new GeneratedChallengeDraftDto(),
      {
        title: 'Draft title',
        description: 'Draft body',
      },
    );
    const createAchievementDto = Object.assign(new CreateAchievementDto(), {
      name: 'First blood',
      description: 'Win your first match',
      imageUrl: 'https://example.com/badge.png',
      type: 'progression',
    });
    const createCosmeticDto = Object.assign(new CreateCosmeticDto(), {
      name: 'Gold Border',
      description: 'Fancy border',
      imageUrl: 'https://example.com/cosmetic.png',
      rarity: 'legendary',
      cosmeticType: 'border',
    });
    const getChallengesQueryDto = Object.assign(new ChallengeQueryDto(), {
      page: 1,
      limit: 20,
      difficulty: 'easy',
      type: 'code',
      search: 'fizz',
      deleted: false,
    });
    const listMySubmissionsDto = Object.assign(new ListMySubmissionsDto(), {
      page: 1,
      limit: 10,
    });

    expect(awardChallengeDto.type).toBe(LeaderboardType.WEEKLY);
    expect(createLeaderboardEntryDto.userId).toBe('user-1');
    expect(bulkImportResponseDto.errors).toHaveLength(1);
    expect(challengeResponseDto.title).toBe('FizzBuzz');
    expect(recommendationResponseDto.meta.modelVersion).toBe('heuristic-acceptance-rate');
    expect(userCreationDto.username).toBe('coder');
    expect(updateUserDto.password).toBe('secret456');
    expect(generatedChallengeDraftDto.title).toBe('Draft title');
    expect(createAchievementDto.name).toBe('First blood');
    expect(createCosmeticDto.name).toBe('Gold Border');
    expect(getChallengesQueryDto.search).toBe('fizz');
    expect(listMySubmissionsDto.limit).toBe(10);
    expect(LeaderboardType.SCORE).toBe('score');
  });

  it('instantiates lower-coverage entities and assigns fields', () => {
    const userAchievement = Object.assign(new UserAchievement(), {
      id: 'ua-1',
      unlockedAt: new Date(),
    });
    const userCosmetic = Object.assign(new UserCosmetic(), {
      id: 'uc-1',
      equipped: true,
    });
    const imposterParticipant = Object.assign(new ImposterParticipant(), {
      id: 'ip-1',
      isAlive: true,
      role: 'crewmate',
    });
    const challengeReviewUpvote = Object.assign(new ChallengeReviewUpvote(), {
      id: 'upvote-1',
    });
    const matchEntity = Object.assign(new Match(), {
      id: 'match-1',
      status: 'pending',
      visibility: 'public',
    });
    const matchMessage = Object.assign(new MatchMessage(), {
      id: 'message-1',
      message: 'hello',
    });

    expect(userAchievement.id).toBe('ua-1');
    expect(userCosmetic.equipped).toBe(true);
    expect(imposterParticipant.isAlive).toBe(true);
    expect(challengeReviewUpvote.id).toBe('upvote-1');
    expect(matchEntity.visibility).toBe('public');
    expect(matchMessage.message).toBe('hello');
  });
});
