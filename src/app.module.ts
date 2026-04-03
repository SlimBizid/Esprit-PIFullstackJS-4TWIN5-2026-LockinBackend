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
import { CodeExecutionController } from './code-execution/code-execution.controller';
import { CodeExecutionService } from './code-execution/code-execution.service';
import { Match } from './match/entities/match.entity';
import { MatchSubmission } from './match/entities/match-submission.entity';
import { MatchController } from './match/match.controller';
import { MatchService } from './match/match.service';
import { ChallengeSubmission } from './submission/entities/challenge-submission.entity';
import { SubmissionController } from './submission/submission.controller';
import { SubmissionService } from './submission/submission.service';

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
        Match,
        MatchSubmission,
        ChallengeSubmission,
      ],
      ssl: process.env.ENV == 'prod',
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      Challenge,
      Match,
      MatchSubmission,
      ChallengeSubmission,
    ]),
    UserModule,
    AuthModule,
    TeamModule,
    CosmeticModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    ChallengeController,
    CodeExecutionController,
    MatchController,
    SubmissionController,
  ],
  providers: [
    AppService,
    ChallengeService,
    CodeExecutionService,
    MatchService,
    SubmissionService,
  ],
})
export class AppModule {}
