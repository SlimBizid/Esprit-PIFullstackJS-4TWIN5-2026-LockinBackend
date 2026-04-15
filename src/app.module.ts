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
import { PendingInvitation } from './team/entities/pending-invitation.entity';
import { CosmeticModule } from './cosmetic/cosmetic.module';
import { Cosmetic } from './cosmetic/entities/cosmetic.entity';
import { ChallengeController } from './challenge/challenge.controller';
import { ChallengeService } from './challenge/challenge.service';
import { BlacklistedToken } from './auth/token-blacklist/token-blacklist.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { LeaderboardEntry } from './leaderboard/entities/leaderboard.entity';
import { CodeExecutionController } from './code-execution/code-execution.controller';
import { CodeExecutionService } from './code-execution/code-execution.service';
import { Match } from './match/entities/match.entity';
import { MatchMessage } from './match/entities/match-message.entity';
import { MatchSubmission } from './match/entities/match-submission.entity';
import { MatchController } from './match/match.controller';
import { MatchService } from './match/match.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [
        User,
        Cosmetic,
        BlacklistedToken,
        Challenge,
        Team,
<<<<<<< HEAD
        PendingInvitation,
      ],
=======
        Match,
        MatchMessage,
        MatchSubmission,
        ChallengeSubmission,
        ChallengeReview,
        ChallengeReviewComment,
        ChallengeReviewUpvote,
        ChallengeReviewReport,
        ChallengeReviewCommentReport,
        LeaderboardEntry,
      ],
      ssl: process.env.ENV == 'prod',
>>>>>>> 36d3c9d9430017815b2d7f6b1aa0a00f7801a590
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      Challenge,
      Match,
      MatchMessage,
      MatchSubmission,
      ChallengeSubmission,
      ChallengeReview,
      ChallengeReviewComment,
      ChallengeReviewUpvote,
      ChallengeReviewReport,
      ChallengeReviewCommentReport,
    ]),
    UserModule,
    AuthModule,
    TeamModule,
    CosmeticModule,
    LeaderboardModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    ChallengeController,
    CodeExecutionController,
    MatchController,
    SubmissionController,
    ReviewController,
  ],
  providers: [
    AppService,
    ChallengeService,
    CodeExecutionService,
    MatchService,
    SubmissionService,
    ReviewService,
  ],
})
export class AppModule {}
