import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';

import { UpdatePlagiarismFlagDto } from './dto/update-plagiarism-flag.dto';
import { PlagiarismService } from './plagiarism.service';

@Controller('admin/plagiarism-flags')
@UseGuards(JwtAuthGuard)
export class PlagiarismController {
  constructor(private readonly plagiarismService: PlagiarismService) {}

  @Get()
  listFlags(@Request() req: { user: User }, @Query('status') status?: string) {
    return this.plagiarismService.listFlags(req.user, status);
  }

  @Patch(':flagId')
  updateFlag(
    @Param('flagId') flagId: string,
    @Body() dto: UpdatePlagiarismFlagDto,
    @Request() req: { user: User },
  ) {
    return this.plagiarismService.updateFlag(flagId, dto, req.user);
  }
}
