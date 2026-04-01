import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ListMySubmissionsDto } from './dto/list-my-submissions.dto';
import { SubmissionService } from './submission.service';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  createSubmission(
    @Body() dto: CreateSubmissionDto,
    @Request() req: { user: User },
  ) {
    return this.submissionService.createSubmission(dto, req.user);
  }

  @Get('me')
  listMySubmissions(
    @Query() query: ListMySubmissionsDto,
    @Request() req: { user: User },
  ) {
    return this.submissionService.listMySubmissions(req.user, query);
  }
}
