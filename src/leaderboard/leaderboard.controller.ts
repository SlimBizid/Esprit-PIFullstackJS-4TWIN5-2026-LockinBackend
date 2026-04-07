import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('score')
  getScoreLeaderboard() {
    return this.leaderboardService.getScoreLeaderboard();
  }

  @Get('xp')
  getXpLeaderboard() {
    return this.leaderboardService.getXpLeaderboard();
  }

  @Get('user/:userId')
  getUserStanding(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.leaderboardService.getUserStanding(userId);
  }
}
