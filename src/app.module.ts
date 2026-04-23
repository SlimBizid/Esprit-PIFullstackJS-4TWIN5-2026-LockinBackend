import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { Challenge } from './challenge/entities/challenge.entity';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { Team } from './team/entities/team.entity';
import { CosmeticModule } from './cosmetic/cosmetic.module';
import { Cosmetic } from './cosmetic/entities/cosmetic.entity';
import { ChallengeController } from './challenge/challenge.controller';
import { ChallengeService } from './challenge/challenge.service';
import { BlacklistedToken } from './auth/token-blacklist/token-blacklist.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { LeaderboardEntry } from './leaderboard/entities/leaderboard.entity';
import { UserChallengeReward } from './leaderboard/entities/user-challenge-reward.entity';
import { CodeExecutionController } from './code-execution/code-execution.controller';
import { CodeExecutionService } from './code-execution/code-execution.service';
import { Match } from './match/entities/match.entity';
import { MatchMessage } from './match/entities/match-message.entity';
import { MatchSubmission } from './match/entities/match-submission.entity';
import { MatchController } from './match/match.controller';
import { MatchService } from './match/match.service';
import { ImposterController } from './imposter/imposter.controller';
import { ImposterService } from './imposter/imposter.service';
import { ImposterMatch } from './imposter/entities/imposter-match.entity';
import { ImposterParticipant } from './imposter/entities/imposter-participant.entity';
import { ImposterSubmission } from './imposter/entities/imposter-submission.entity';
import { ChallengeSubmission } from './submission/entities/challenge-submission.entity';
import { SubmissionController } from './submission/submission.controller';
import { SubmissionService } from './submission/submission.service';
import { ReviewController } from './review/review.controller';
import { ReviewService } from './review/review.service';
import { ChallengeReview } from './review/entities/challenge-review.entity';
import { ChallengeReviewComment } from './review/entities/challenge-review-comment.entity';
import { ChallengeReviewUpvote } from './review/entities/challenge-review-upvote.entity';
import { ChallengeReviewReport } from './review/entities/challenge-review-report.entity';
import { ChallengeReviewCommentReport } from './review/entities/challenge-review-comment-report.entity';
import { ChallengeRecommendation } from './recommendation/entities/challenge-recommendation.entity';
import { RecommendationController } from './recommendation/recommendation.controller';
import { RecommendationService } from './recommendation/recommendation.service';
import { AchievementModule } from './achievement/achievement.module';
import { Achievement } from './achievement/entities/achievement.entity';
import { UserAchievement } from './achievement/entities/userachievement.entity';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || undefined,
      host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
      port: process.env.DATABASE_URL
        ? undefined
        : parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DATABASE_URL ? undefined : process.env.DB_USERNAME,
      password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
      database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
      entities: [
        User,
        Cosmetic,
        BlacklistedToken,
        Challenge,
        Team,
        Match,
        MatchMessage,
        MatchSubmission,
        ImposterMatch,
        ImposterParticipant,
        ImposterSubmission,
        ChallengeSubmission,
        ChallengeReview,
        ChallengeReviewComment,
        ChallengeReviewUpvote,
        ChallengeReviewReport,
        ChallengeReviewCommentReport,
        ChallengeRecommendation,
        LeaderboardEntry,
        UserChallengeReward,
        Achievement,
        UserAchievement,
      ],
      ssl:
        process.env.ENV == 'prod'
          ? {
              rejectUnauthorized: false,
            }
          : false,
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      Challenge,
      Match,
      MatchMessage,
      MatchSubmission,
      ImposterMatch,
      ImposterParticipant,
      ImposterSubmission,
      ChallengeSubmission,
      ChallengeReview,
      ChallengeReviewComment,
      ChallengeReviewUpvote,
      ChallengeReviewReport,
      ChallengeReviewCommentReport,
      ChallengeRecommendation,
    ]),
    UserModule,
    AuthModule,
    TeamModule,
    CosmeticModule,
    LeaderboardModule,
    ScheduleModule.forRoot(),
    StorageModule,
    AchievementModule,
  ],
  controllers: [
    AppController,
    ChallengeController,
    CodeExecutionController,
    MatchController,
    ImposterController,
    SubmissionController,
    ReviewController,
    RecommendationController,
  ],
  providers: [
    AppService,
    ChallengeService,
    CodeExecutionService,
    MatchService,
    ImposterService,
    SubmissionService,
    ReviewService,
    RecommendationService,
  ],
})
export class AppModule {}
