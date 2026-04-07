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

import { CreateMatchDto } from './dto/create-match.dto';
import { CreateMatchMessageDto } from './dto/create-match-message.dto';
import { ListPublicMatchesDto } from './dto/list-public-matches.dto';
import { SubmitMatchDto } from './dto/submit-match.dto';
import { MatchService } from './match.service';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post('queue')
  createMatch(@Body() dto: CreateMatchDto, @Request() req: { user: User }) {
    return this.matchService.createMatch(dto, req.user);
  }

  @Post(':id/join')
  joinMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: User },
  ) {
    return this.matchService.joinMatch(id, req.user);
  }

  @Get('public')
  listPublicMatches(
    @Query() dto: ListPublicMatchesDto,
    @Request() req: { user: User },
  ) {
    return this.matchService.listPublicMatches(dto, req.user);
  }

  @Post('random')
  joinRandomMatch(
    @Body() dto: ListPublicMatchesDto,
    @Request() req: { user: User },
  ) {
    return this.matchService.joinRandomMatch(dto, req.user);
  }

  @Get(':id')
  getMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: User },
  ) {
    return this.matchService.getMatch(id, req.user);
  }

  @Get(':id/messages')
  listMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: User },
  ) {
    return this.matchService.listMessages(id, req.user);
  }

  @Post(':id/messages')
  createMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMatchMessageDto,
    @Request() req: { user: User },
  ) {
    return this.matchService.createMessage(id, dto, req.user);
  }

  @Post(':id/surrender')
  surrenderMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: User },
  ) {
    return this.matchService.surrenderMatch(id, req.user);
  }

  @Post(':id/submit')
  submitToMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitMatchDto,
    @Request() req: { user: User },
  ) {
    return this.matchService.submitToMatch(id, dto, req.user);
  }
}
