import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ChallengeDifficulty } from './enums/challenge-difficulty.enums';
import { ChallengeType } from './enums/challenge-type.enums';
import { UserType } from 'src/user/enums/user-type.enum';
import { User } from 'src/user/entities/user.entity';
import { ChallengeTopic } from './enums/challenge-topic.enums';

@Controller('challenge')
@UseGuards(JwtAuthGuard)
export class ChallengeController {
  constructor(private challengeService: ChallengeService) {}

  @Get()
  async getChallenges(
    @Request() req: Request & { user: User },
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('challenge_difficulty') challenge_difficulty?: ChallengeDifficulty,
    @Query('challenge_type') challenge_type?: ChallengeType,
    @Query('search') search?: string,
    @Query('deleted', new ParseBoolPipe({ optional: true })) deleted?: boolean,
  ) {
    return this.challengeService.findAll(
      req.user.type,
      Number(page),
      Number(limit),
      challenge_difficulty,
      challenge_type,
      search,
      deleted,
    );
  }

  @Post('/add')
  async postChallenge(
    @Request() req: Request & { user: User },
    @Body('challenge_title') challenge_title: string,
    @Body('challenge_type') challenge_type: ChallengeType,
    @Body('challenge_difficulty') challenge_difficulty: ChallengeDifficulty,
    @Body('challenge_content') challenge_content: string,
    @Body('topics') topics: ChallengeTopic[],
    @Body('challenge_acceptance_rate') challenge_acceptance_rate?: number,
  ) {
    if (req.user.type != UserType.ADMIN)
      throw new ForbiddenException(
        `As a ${req.user.type} you lack the permissions to perform this action`,
      );
    await this.challengeService.createChallenge(
      challenge_title,
      challenge_content,
      challenge_difficulty,
      challenge_type,
      topics,
      challenge_acceptance_rate,
    );
  }

  @Patch(':id/edit')
  async patchChallenge(
    @Request() req: Request & { user: User },
    @Param('id', ParseIntPipe) id: number,
    @Body('challenge_title') challenge_title?: string,
    @Body('challenge_type') challenge_type?: ChallengeType,
    @Body('challenge_difficulty') challenge_difficulty?: ChallengeDifficulty,
    @Body('challenge_content') challenge_content?: string,
  ) {
    if (req.user.type != UserType.ADMIN)
      throw new ForbiddenException(
        `As a ${req.user.type} you lack the permissions to perform this action`,
      );

    await this.challengeService.updateChallenge(
      id,
      challenge_title,
      challenge_content,
      challenge_difficulty,
      challenge_type,
    );
  }
}
