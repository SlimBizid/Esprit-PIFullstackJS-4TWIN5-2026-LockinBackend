import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserType } from 'src/user/enums/user-type.enum';
import { ChallengeQueryDto } from './dto/get-challenges-query.dto';
import { ChallengeResponseDto } from './dto/challenge-response.dto';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';

@Controller('challenge')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class ChallengeController {
  constructor(private challengeService: ChallengeService) {}

  @Get()
  async getChallenges(
    @Request() req: Request & { user: { role: UserType } },
    @Query() queryDto: ChallengeQueryDto,
  ): Promise<any> {
    const userRole = req.user?.role || UserType.PLAYER;

    const result = await this.challengeService.findAll(queryDto, userRole);

    return result;
  }

  @Get(':id')
  async getChallengeById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: Request & { user: { role: UserType } },
  ): Promise<ChallengeResponseDto> {
    const userRole = req.user?.role || UserType.PLAYER;

    return await this.challengeService.findOne(id, userRole);
  }

  @Post('add')
  async postChallenge(
    @Body() createChallengeDto: CreateChallengeDto,
    @Request() req: Request & { user: { role: UserType } },
  ): Promise<ChallengeResponseDto> {
    if (req.user?.role !== UserType.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can create challenges.',
      );
    }

    return await this.challengeService.create(createChallengeDto);
  }

  @Patch(':id/edit')
  async patchChallenge(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateChallengeDto: UpdateChallengeDto,
    @Request() req: Request & { user: { role: UserType } },
  ): Promise<ChallengeResponseDto> {
    if (req.user?.role !== UserType.ADMIN) {
      throw new ForbiddenException('Only administrators can edit challenges.');
    }

    return await this.challengeService.update(id, updateChallengeDto);
  }

  @Patch(':id/restore')
  async restoreChallenge(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: Request & { user: { role: UserType } },
  ): Promise<{ message: string }> {
    if (req.user?.role !== UserType.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can restore challenges.',
      );
    }

    await this.challengeService.restore(id);

    return {
      message: `Challenge #${id} has been successfully restored.`,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChallenge(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: Request & { user: { role: UserType } },
  ): Promise<void> {
    if (req.user?.role !== UserType.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can delete challenges.',
      );
    }

    await this.challengeService.softDelete(id);
  }
}
