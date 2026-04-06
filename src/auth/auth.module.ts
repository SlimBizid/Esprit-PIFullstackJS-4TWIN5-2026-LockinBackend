import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { User } from '../user/entities/user.entity';
import { EmailModule } from '../email/email.module';
import { BlacklistedToken } from './token-blacklist/token-blacklist.entity';
import { TokenBlacklistService } from './token-blacklist/token-blacklist.service';
import { RefreshTokenStrategy } from './refresh-token.strategy';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([User, BlacklistedToken]),
    UserModule,
    PassportModule,
    EmailModule,
    LeaderboardModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '30m' },
      }),
    }),
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    TokenBlacklistService,
    RefreshTokenStrategy,
  ],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
