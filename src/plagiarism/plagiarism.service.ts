import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { UserType } from 'src/user/enums/user-type.enum';
import { Repository } from 'typeorm';

import { UpdatePlagiarismFlagDto } from './dto/update-plagiarism-flag.dto';
import { PlagiarismFlagStatus } from './enums/plagiarism-flag-status.enum';
import { PlagiarismFlag } from './entities/plagiarism-flag.entity';

@Injectable()
export class PlagiarismService {
  constructor(
    @InjectRepository(PlagiarismFlag)
    private readonly plagiarismFlagRepository: Repository<PlagiarismFlag>,
  ) {}

  async listFlags(user: User, status?: string) {
    this.ensureAdmin(user);

    const normalizedStatus = status?.trim().toLowerCase();
    const where =
      normalizedStatus && normalizedStatus !== 'all'
        ? { status: this.parseStatus(normalizedStatus) }
        : undefined;

    const flags = await this.plagiarismFlagRepository.find({
      where,
      order: {
        status: 'ASC',
        suspicionScore: 'DESC',
        createdAt: 'DESC',
      },
    });

    return flags.map((flag) => this.serializeFlag(flag));
  }

  async updateFlag(
    flagId: string,
    dto: UpdatePlagiarismFlagDto,
    admin: User,
  ) {
    this.ensureAdmin(admin);

    const nextStatus = this.parseStatus(dto.status);
    const flag = await this.plagiarismFlagRepository.findOne({
      where: { id: flagId },
    });

    if (!flag) {
      throw new NotFoundException('Plagiarism flag not found.');
    }

    flag.status = nextStatus;
    flag.adminNotes = dto.adminNotes?.trim() || null;
    flag.reviewedByAdminId = admin.id;
    flag.reviewedAt =
      nextStatus === PlagiarismFlagStatus.OPEN ? null : new Date();

    const savedFlag = await this.plagiarismFlagRepository.save(flag);
    return this.serializeFlag(savedFlag);
  }

  private ensureAdmin(user: User) {
    if (user.type !== UserType.ADMIN) {
      throw new ForbiddenException(
        'Plagiarism moderation is only available to admins.',
      );
    }
  }

  private parseStatus(value: string) {
    switch (value) {
      case PlagiarismFlagStatus.OPEN:
        return PlagiarismFlagStatus.OPEN;
      case PlagiarismFlagStatus.REVIEWED:
        return PlagiarismFlagStatus.REVIEWED;
      case PlagiarismFlagStatus.DISMISSED:
        return PlagiarismFlagStatus.DISMISSED;
      default:
        throw new BadRequestException('Invalid plagiarism flag status.');
    }
  }

  private serializeFlag(flag: PlagiarismFlag) {
    return {
      id: flag.id,
      challengeId: flag.challengeId,
      challengeTitle: flag.challengeTitle,
      challengeDifficulty: flag.challengeDifficulty,
      challengeTopics: flag.challengeTopics,
      language: flag.language,
      leftSubmissionId: flag.leftSubmissionId,
      rightSubmissionId: flag.rightSubmissionId,
      leftUserId: flag.leftUserId,
      rightUserId: flag.rightUserId,
      leftUsername: flag.leftUsername,
      rightUsername: flag.rightUsername,
      leftVerdict: flag.leftVerdict,
      rightVerdict: flag.rightVerdict,
      leftSourceCode: flag.leftSourceCode,
      rightSourceCode: flag.rightSourceCode,
      ruleScore: Number(flag.ruleScore),
      anomalyScore: Number(flag.anomalyScore),
      suspicionScore: Number(flag.suspicionScore),
      normalizedSimilarity: Number(flag.normalizedSimilarity),
      tokenJaccard: Number(flag.tokenJaccard),
      ngramJaccard: Number(flag.ngramJaccard),
      lengthRatio: Number(flag.lengthRatio),
      hoursGap: Number(flag.hoursGap),
      reason: flag.reason,
      modelVersion: flag.modelVersion,
      status: flag.status,
      adminNotes: flag.adminNotes,
      reviewedByAdminId: flag.reviewedByAdminId,
      reviewedAt: flag.reviewedAt?.toISOString() ?? null,
      createdAt: flag.createdAt.toISOString(),
      updatedAt: flag.updatedAt.toISOString(),
    };
  }
}
