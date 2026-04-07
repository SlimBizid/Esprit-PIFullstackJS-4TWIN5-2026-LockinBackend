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
  UploadedFile,
  UseInterceptors as UseInterceptorsFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChallengeService } from './challenge.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserType } from 'src/user/enums/user-type.enum';
import { ChallengeQueryDto } from './dto/get-challenges-query.dto';
import { ChallengeResponseDto } from './dto/challenge-response.dto';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { BulkImportResponseDto } from './dto/bulk-import-response.dto';
import { parseCsvToChallenges } from './utils/csv-parser.util';

@Controller('challenges')
@UseInterceptors(ClassSerializerInterceptor)
export class ChallengeController {
  constructor(private challengeService: ChallengeService) {}

  @Get()
  async getChallenges(
    @Request() req: Request & { user: { type: UserType } },
    @Query() queryDto: ChallengeQueryDto,
  ): Promise<any> {
    const userRole = req.user?.type || UserType.PLAYER;

    const result = await this.challengeService.findAll(queryDto, userRole);

    return result;
  }

  @Get('daily/current')
  async getDailyChallenge(
    @Request() req: Request & { user: { type: UserType } },
  ) {
    const userRole = req.user?.type || UserType.PLAYER;

    return this.challengeService.findDailyChallenge(userRole);
  }

  @Get(':id')
  async getChallengeById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: Request & { user: { type: UserType } },
  ): Promise<ChallengeResponseDto> {
    const userRole = req.user?.type || UserType.PLAYER;

    return await this.challengeService.findOne(id, userRole);
  }

  @Post('add')
  @UseGuards(JwtAuthGuard)
  async postChallenge(
    @Body() createChallengeDto: CreateChallengeDto,
    @Request() req: Request & { user: { type: UserType } },
  ): Promise<ChallengeResponseDto> {
    if (req.user?.type !== UserType.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can create challenges.',
      );
    }

    return await this.challengeService.create(createChallengeDto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importChallenges(
    @UploadedFile() file: any,
    @Request() req: Request & { user: { type: UserType } },
  ): Promise<BulkImportResponseDto> {
    if (
      req.user?.type !== UserType.ADMIN &&
      req.user?.type !== UserType.CONTRIBUTOR
    ) {
      throw new ForbiddenException(
        'Only administrators and approved contributors can import challenges.',
      );
    }

    if (!file) {
      throw new ForbiddenException('No file uploaded.');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new ForbiddenException('Only CSV files are allowed.');
    }

    try {
      const { challenges, errors: parseErrors } = await parseCsvToChallenges(
        file.buffer,
      );
      const result = await this.challengeService.bulkCreate(challenges);

      return {
        successCount: result.successCount,
        failureCount: result.failureCount + parseErrors.length,
        errors: [...parseErrors, ...result.errors],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new ForbiddenException(
        'Failed to process CSV file: ' + errorMessage,
      );
    }
  }

  @Patch(':id/edit')
  @UseGuards(JwtAuthGuard)
  async patchChallenge(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateChallengeDto: UpdateChallengeDto,
    @Request() req: Request & { user: { type: UserType } },
  ): Promise<ChallengeResponseDto> {
    if (req.user?.type !== UserType.ADMIN) {
      throw new ForbiddenException('Only administrators can edit challenges.');
    }

    return await this.challengeService.update(id, updateChallengeDto);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard)
  async restoreChallenge(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: Request & { user: { type: UserType } },
  ): Promise<{ message: string }> {
    if (req.user?.type !== UserType.ADMIN) {
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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChallenge(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: Request & { user: { type: UserType } },
  ): Promise<void> {
    if (req.user?.type !== UserType.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can delete challenges.',
      );
    }

    await this.challengeService.softDelete(id);
  }
}
