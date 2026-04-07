import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeService } from 'src/challenge/challenge.service';
import { ChallengeType } from 'src/challenge/enums/challenge-type.enums';
import { CodeExecutionService } from 'src/code-execution/code-execution.service';
import { MatchVerdict } from 'src/match/enums/match-verdict.enum';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ListMySubmissionsDto } from './dto/list-my-submissions.dto';
import { ChallengeSubmission } from './entities/challenge-submission.entity';
import { LeaderboardService } from 'src/leaderboard/leaderboard.service';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(ChallengeSubmission)
    private readonly submissionRepository: Repository<ChallengeSubmission>,
    private readonly challengeService: ChallengeService,
    private readonly codeExecutionService: CodeExecutionService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  async createSubmission(dto: CreateSubmissionDto, user: User) {
    const challenge = await this.challengeService.findOne(dto.challengeId);

    if (challenge.type !== ChallengeType.SOLO) {
      throw new BadRequestException(
        'Only solo challenges can be submitted through this endpoint.',
      );
    }

    const execution = await this.codeExecutionService.runCode(dto);
    const passedCount = execution.results.filter(
      (result) => result.passed,
    ).length;
    const totalCount = execution.results.length;
    const verdict = this.getVerdict(execution.results, passedCount, totalCount);
    if (verdict == MatchVerdict.ACCEPTED) {
      await this.leaderboardService.awardChallenge({
        challengeId: challenge.id,
        userId: user.id,
        difficulty: challenge.difficulty,
        type: challenge.type,
      });
    }
    const submission = this.submissionRepository.create({
      challengeId: challenge.id,
      userId: user.id,
      language: dto.language,
      sourceCode: dto.sourceCode,
      verdict,
      passedCount,
      totalCount,
      results: execution.results.map((result) => ({
        passed: result.passed,
        actual: result.actual,
        expected: result.expected,
        runtime: result.runtime,
        memoryKb: result.memoryKb ?? null,
        status: result.status ?? '',
      })),
    });

    const savedSubmission = await this.submissionRepository.save(submission);

    return this.serializeSubmission({
      ...savedSubmission,
      challenge,
      user,
    });
  }

  async listMySubmissions(user: User, query: ListMySubmissionsDto) {
    const limit = query.limit ?? 50;
    const qb = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.challenge', 'challenge')
      .where('submission.userId = :userId', { userId: user.id })
      .orderBy('submission.createdAt', 'DESC')
      .take(limit);

    if (query.challengeId) {
      qb.andWhere('submission.challengeId = :challengeId', {
        challengeId: query.challengeId,
      });
    }

    const submissions = await qb.getMany();

    return {
      data: submissions.map((submission) =>
        this.serializeSubmission(submission),
      ),
      meta: {
        itemCount: submissions.length,
        limit,
      },
    };
  }

  private getVerdict(
    results: Array<{ passed: boolean; status?: string }>,
    passedCount: number,
    totalCount: number,
  ) {
    if (totalCount > 0 && passedCount === totalCount) {
      return MatchVerdict.ACCEPTED;
    }

    if (
      results.some((result) =>
        result.status?.toLowerCase().includes('compilation error'),
      )
    ) {
      return MatchVerdict.COMPILATION_ERROR;
    }

    if (
      results.some((result) => result.status?.toLowerCase().includes('runtime'))
    ) {
      return MatchVerdict.RUNTIME_ERROR;
    }

    return MatchVerdict.WRONG_ANSWER;
  }

  private serializeSubmission(submission: ChallengeSubmission) {
    return {
      id: submission.id,
      challengeId: submission.challengeId,
      challenge: submission.challenge
        ? {
            id: submission.challenge.id,
            title: submission.challenge.title,
            difficulty: submission.challenge.difficulty,
            type: submission.challenge.type,
          }
        : null,
      userId: submission.userId,
      language: submission.language,
      verdict: submission.verdict,
      passedCount: submission.passedCount,
      totalCount: submission.totalCount,
      results: submission.results,
      createdAt: submission.createdAt,
    };
  }
}
