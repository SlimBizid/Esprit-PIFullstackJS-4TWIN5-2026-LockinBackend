import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  ParseEnumPipe,
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { LeaderboardScope } from './enums/leaderboard-scope.enum';
import { Rank } from './enums/rank.enum';

@Controller('leaderboard')
@UseInterceptors(ClassSerializerInterceptor)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('score')
  getScoreLeaderboard(
    @Query('scope', new ParseEnumPipe(LeaderboardScope, { optional: true }))
    scope: LeaderboardScope = LeaderboardScope.SEASON,
  ) {
    return this.leaderboardService.getScoreLeaderboard(scope);
  }

  @Get('xp')
  getXpLeaderboard() {
    return this.leaderboardService.getXpLeaderboard();
  }

  @Get('user/:userId')
  getUserStanding(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.leaderboardService.getUserStanding(userId);
  }

  @Get('ranks/thresholds')
  getRankThresholds(): Record<Rank, { min: number; max: number }> {
    return this.leaderboardService.getRankThresholds();
  }

  @Get('ranks/all')
  getAllRanks(): Rank[] {
    return this.leaderboardService.getAllRanks();
  }
}
