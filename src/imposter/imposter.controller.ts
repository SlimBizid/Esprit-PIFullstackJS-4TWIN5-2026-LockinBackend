import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';

import { CreateImposterMatchDto } from './dto/create-imposter-match.dto';
import { ListPublicImposterMatchesDto } from './dto/list-public-imposter-matches.dto';
import { SubmitImposterMatchDto } from './dto/submit-imposter-match.dto';
import { VoteImposterMatchDto } from './dto/vote-imposter-match.dto';
import { ImposterService } from './imposter.service';

@Controller('imposter-matches')
@UseGuards(JwtAuthGuard)
export class ImposterController {
  constructor(private readonly imposterService: ImposterService) {}

  @Post()
  createMatch(
    @Body() dto: CreateImposterMatchDto,
    @Request() req: { user: User },
  ) {
    return this.imposterService.createMatch(dto, req.user);
  }

  @Get('public')
  listPublicMatches(
    @Query() dto: ListPublicImposterMatchesDto,
    @Request() req: { user: User },
  ) {
    return this.imposterService.listPublicMatches(dto, req.user);
  }

  @Get(':id')
  getMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: User },
  ) {
    return this.imposterService.getMatch(id, req.user);
  }

  @Post(':id/join')
  joinMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: User },
  ) {
    return this.imposterService.joinMatch(id, req.user);
  }

  @Post(':id/start')
  startMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: User },
  ) {
    return this.imposterService.startMatch(id, req.user);
  }

  @Post(':id/submit')
  submitToMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitImposterMatchDto,
    @Request() req: { user: User },
  ) {
    return this.imposterService.submitToMatch(id, dto, req.user);
  }

  @Post(':id/vote')
  vote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoteImposterMatchDto,
    @Request() req: { user: User },
  ) {
    return this.imposterService.vote(id, dto, req.user);
  }
}
