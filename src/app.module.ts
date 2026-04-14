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
        PendingInvitation,
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Challenge]),
    UserModule,
    AuthModule,
    TeamModule,
    CosmeticModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, ChallengeController],
  providers: [AppService, ChallengeService],
})
export class AppModule {}
