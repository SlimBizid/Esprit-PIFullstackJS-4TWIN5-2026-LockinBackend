import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeService } from 'src/challenge/challenge.service';
import { ChallengeType } from 'src/challenge/enums/challenge-type.enums';
import { evaluateQuizAnswers } from 'src/challenge/utils/evaluate-quiz.util';
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

    if (![ChallengeType.SOLO, ChallengeType.QUIZ].includes(challenge.type)) {
      throw new BadRequestException(
        'Only solo challenge modes can be submitted through this endpoint.',
      );
    }

    const isQuizChallenge = challenge.type === ChallengeType.QUIZ;
    const evaluation = isQuizChallenge
      ? this.evaluateQuizSubmission(challenge.quizQuestions, dto.answers)
      : await this.evaluateCodeSubmission(dto);

    const submission = this.submissionRepository.create({
      challengeId: challenge.id,
      userId: user.id,
      language: isQuizChallenge ? 'quiz' : (dto.language as string),
      sourceCode: isQuizChallenge
        ? JSON.stringify(dto.answers ?? {})
        : (dto.sourceCode as string),
      verdict: evaluation.verdict,
      passedCount: evaluation.passedCount,
      totalCount: evaluation.totalCount,
      results: evaluation.results.map((result) => ({
        passed: result.passed,
        actual: result.actual,
        expected: result.expected,
        runtime: result.runtime,
        memoryKb: result.memoryKb ?? null,
        status: result.status ?? '',
      })),
    });

    const savedSubmission = await this.submissionRepository.save(submission);

    if (evaluation.verdict === MatchVerdict.ACCEPTED) {
      await this.leaderboardService.awardChallenge({
        userId: user.id,
        challengeId: challenge.id,
        difficulty: challenge.difficulty,
        type: challenge.type,
      });
    }

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

  private async evaluateCodeSubmission(dto: CreateSubmissionDto) {
    if (!dto.language || !dto.sourceCode?.trim()) {
      throw new BadRequestException(
        'Code challenges require both a language and source code.',
      );
    }

    const execution = await this.codeExecutionService.runCode({
      challengeId: dto.challengeId,
      language: dto.language as
        | 'javascript'
        | 'typescript'
        | 'python'
        | 'java'
        | 'cpp',
      sourceCode: dto.sourceCode,
    });
    const passedCount = execution.results.filter(
      (result) => result.passed,
    ).length;
    const totalCount = execution.results.length;

    return {
      results: execution.results,
      passedCount,
      totalCount,
      verdict: this.getVerdict(execution.results, passedCount, totalCount),
    };
  }

  private evaluateQuizSubmission(
    questions: Array<{
      id: string;
      prompt: string;
      options: Array<{ id: string; text: string }>;
      correctOptionIds: string[];
      explanation?: string;
    }>,
    answers?: Record<string, string[]>,
  ) {
    if (questions.length === 0) {
      throw new BadRequestException(
        'This quiz challenge does not have any questions configured.',
      );
    }

    if (!answers || Object.keys(answers).length === 0) {
      throw new BadRequestException(
        'Select at least one answer before submitting.',
      );
    }

    return evaluateQuizAnswers(questions, answers);
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
